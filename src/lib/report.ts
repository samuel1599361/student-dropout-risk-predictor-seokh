import { jsPDF } from "jspdf";
import { FEATURE_KEYS, FEATURE_META, MODEL_METRICS, type PredictionResult } from "./model";
import {
  DEFAULT_TEMPLATE,
  hexToRgb,
  loadTemplate,
  tint,
  type ReportTemplate,
} from "./report-template";

export type StudentRecord = {
  student_id: string;
  age: number;
  ParentInvolvement: number;
  PreviousFailures: number;
  AssignmentCompletion: number;
  Attendance: number;
  AcademicPerformance: number;
  AverageScore: number;
  EngagementScore: number;
  StudyHours: number;
  dropout?: number | null;
};

const INK: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [214, 222, 232];

export function buildReport(
  student: StudentRecord,
  result: PredictionResult,
  preparedBy: string,
  template: ReportTemplate = DEFAULT_TEMPLATE,
): jsPDF {
  const t = { ...DEFAULT_TEMPLATE, ...template };
  const compact = t.layout === "compact";
  const RED = hexToRgb(t.riskColor);
  const GREEN = hexToRgb(t.safeColor);
  const HEADER = hexToRgb(t.headerColor);
  const ACCENT = hexToRgb(t.accentColor);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = compact ? 40 : 48;
  const atRisk = result.label === 1;
  let y = 0;

  const ensure = (needed: number) => {
    if (y + needed > H - 60) {
      footer();
      doc.addPage();
      y = M;
    }
  };

  const footer = () => {
    if (!t.showFooter && !t.showPageNumbers) return;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.6);
    doc.line(M, H - 44, W - M, H - 44);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
    if (t.showFooter) doc.text(t.footerText, M, H - 30);
    if (t.showPageNumbers)
      doc.text(`Page ${doc.getNumberOfPages()}`, W - M, H - 30, { align: "right" });
  };

  // Header band
  const bandH = compact ? 78 : 96;
  doc.setFillColor(...HEADER);
  doc.rect(0, 0, W, bandH, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(0, bandH, W, 4, "F");

  let textX = M;
  if (t.showLogo && t.logoDataUrl) {
    const size = compact ? 30 : 38;
    try {
      doc.addImage(t.logoDataUrl, "PNG", M, (bandH - size) / 2, size, size);
      textX = M + size + 14;
    } catch {
      textX = M;
    }
  }

  doc.setFont("helvetica", "bold").setFontSize(compact ? 15 : 17).setTextColor(255, 255, 255);
  doc.text(t.orgName, textX, compact ? 32 : 42);
  doc.setFont("helvetica", "normal").setFontSize(compact ? 9 : 10).setTextColor(212, 222, 235);
  doc.text(`${t.reportTitle} - ${t.subtitle}`, textX, compact ? 50 : 62);
  doc.text(
    `Generated: ${new Date().toLocaleString()}   |   Prepared by: ${preparedBy}`,
    textX,
    compact ? 65 : 78,
  );
  y = bandH + (compact ? 26 : 32);

  // Verdict box
  const boxH = compact ? 66 : 76;
  doc.setFillColor(...tint(atRisk ? t.riskColor : t.safeColor, 0.9));
  doc.setDrawColor(...(atRisk ? RED : GREEN));
  doc.setLineWidth(1);
  doc.roundedRect(M, y, W - M * 2, boxH, 8, 8, "FD");

  if (atRisk) {
    doc.setFont("helvetica", "bold").setFontSize(30).setTextColor(...RED);
    doc.text("X", M + 22, y + 48);
  } else {
    doc.setFont("helvetica", "bold").setFontSize(26).setTextColor(...GREEN);
    doc.text("OK", M + 16, y + 46);
  }

  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(...(atRisk ? RED : GREEN));
  doc.text(
    atRisk ? "AT RISK OF DROPOUT (1)" : "NOT AT RISK OF DROPOUT (0)",
    M + 66,
    y + 32,
  );
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...INK);
  doc.text(
    `Risk probability: ${(result.probability * 100).toFixed(1)}%   |   Risk band: ${result.band}   |   Decision threshold: 50%`,
    M + 66,
    y + 52,
  );
  doc.text(`Student ID: ${student.student_id}   |   Age: ${student.age}`, M + 66, y + 66);
  y += boxH + (compact ? 18 : 26);

  const heading = (text: string) => {
    ensure(40);
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...INK);
    doc.text(text, M, y);
    y += 8;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.8);
    doc.line(M, y, W - M, y);
    y += 16;
  };

  // Student details table
  heading("1. Student Details and Input Features");
  const rows: Array<[string, string, string]> = [
    ["Student ID", student.student_id, "identifier"],
    ["Age", String(student.age), "years"],
    ...FEATURE_KEYS.map((key, i): [string, string, string] => [
      `${i + 1}. ${FEATURE_META[key].label}`,
      Number(student[key]).toFixed(FEATURE_META[key].step < 1 ? 2 : 0),
      `benchmark ${FEATURE_META[key].benchmark} ${FEATURE_META[key].unit}`,
    ]),
  ];
  doc.setFontSize(compact ? 8.5 : 9.5);
  const rowH = compact ? 15 : 18;
  rows.forEach((row, idx) => {
    ensure(rowH + 2);
    if (idx % 2 === 0) {
      doc.setFillColor(247, 250, 252);
      doc.rect(M, y - rowH * 0.62, W - M * 2, rowH, "F");
    }
    doc.setFont("helvetica", "normal").setTextColor(...INK);
    doc.text(row[0], M + 6, y);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], M + 250, y);
    doc.setFont("helvetica", "normal").setTextColor(...MUTED);
    doc.text(row[2], M + 340, y);
    y += rowH;
  });
  y += compact ? 12 : 16;

  // Explanation
  heading(
    atRisk ? "2. Why This Student Is At Risk" : "2. Why This Student Is Not At Risk",
  );
  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...INK);
  const intro = doc.splitTextToSize(
    atRisk
      ? `The optimized Gradient Boosting model estimates a ${(result.probability * 100).toFixed(1)}% probability of dropout, above the 50% decision threshold. The factors below are ranked by their measured contribution to this student's risk. Each contribution is computed by re-scoring the student with that single factor moved to the cohort benchmark, holding every other factor constant.`
      : `The optimized Gradient Boosting model estimates a ${(result.probability * 100).toFixed(1)}% probability of dropout, below the 50% decision threshold. The factors below are ranked by their contribution; positive values push risk up, negative values are protective.`,
    W - M * 2 - 8,
  );
  doc.text(intro, M, y);
  y += intro.length * 12 + 12;

  (compact ? result.drivers.slice(0, 3) : result.drivers).forEach((d) => {
    const body = doc.splitTextToSize(d.reason, W - M * 2 - 24);
    ensure(24 + body.length * 12);
    const up = d.impact >= 0;
    doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(...(up ? RED : GREEN));
    doc.text(
      `${up ? "+" : ""}${d.impact.toFixed(1)} pts`,
      M + 4,
      y,
    );
    doc.setTextColor(...INK);
    doc.text(`${d.label}: ${d.value.toFixed(1)} (benchmark ${d.benchmark})`, M + 74, y);
    y += 13;
    doc.setFont("helvetica", "normal").setTextColor(...MUTED);
    doc.text(body, M + 74, y);
    y += body.length * 12 + 8;
  });
  y += 8;

  // Recommendations
  heading("3. Recommended Interventions");
  (compact ? result.recommendations.slice(0, 3) : result.recommendations).forEach((rec, i) => {
    const body = doc.splitTextToSize(rec, W - M * 2 - 30);
    ensure(body.length * 12 + 8);
    doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(...INK);
    doc.text(`${i + 1}.`, M + 4, y);
    doc.setFont("helvetica", "normal");
    doc.text(body, M + 24, y);
    y += body.length * 12 + 6;
  });
  y += 14;

  // Model card
  heading("4. Model Information");
  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...INK);
  const m = MODEL_METRICS;
  const info = [
    `Algorithm: Gradient Boosting Classifier (hyperparameter-tuned, 5-fold cross-validated)`,
    `Task: binary classification - At Risk of Dropout (1) vs Not At Risk of Dropout (0)`,
    `Training data: 1,000 simulated student records (${m.n_train} train / ${m.n_test} hold-out test)`,
    `Hold-out performance: Accuracy ${(m.accuracy * 100).toFixed(1)}%  |  ROC-AUC ${m.roc_auc.toFixed(3)}  |  Precision ${(m.precision * 100).toFixed(1)}%  |  Recall ${(m.recall * 100).toFixed(1)}%  |  F1 ${(m.f1 * 100).toFixed(1)}%`,
    `Selected hyperparameters: ${Object.entries(m.best_params)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`,
    `Features used, in order: ${FEATURE_KEYS.join(", ")}`,
  ];
  (compact ? info.slice(0, 4) : info).forEach((line) => {
    const body = doc.splitTextToSize(line, W - M * 2 - 8);
    ensure(body.length * 12 + 4);
    doc.text(body, M + 4, y);
    y += body.length * 12 + 4;
  });

  y += 10;
  if (!compact) {
  ensure(40);
  doc.setFont("helvetica", "italic").setFontSize(8.5).setTextColor(...MUTED);
  const disclaimer = doc.splitTextToSize(
    "This report is generated from a statistical model trained on simulated data and is intended as decision support for school staff. It must be combined with professional judgement, and should never be the sole basis for any action affecting a student.",
    W - M * 2 - 8,
  );
  doc.text(disclaimer, M + 4, y);
  }

  footer();
  return doc;
}

export function downloadReport(
  student: StudentRecord,
  result: PredictionResult,
  preparedBy: string,
  template: ReportTemplate = loadTemplate(),
) {
  const doc = buildReport(student, result, preparedBy, template);
  doc.save(`SEOK-dropout-risk-${student.student_id}.pdf`);
}
