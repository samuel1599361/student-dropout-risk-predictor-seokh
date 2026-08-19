import { jsPDF } from "jspdf";
import { FEATURE_KEYS, FEATURE_META, MODEL_METRICS, type PredictionResult } from "./model";

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
const RED: [number, number, number] = [190, 30, 45];
const GREEN: [number, number, number] = [13, 124, 102];
const LINE: [number, number, number] = [214, 222, 232];

export function buildReport(
  student: StudentRecord,
  result: PredictionResult,
  preparedBy: string,
): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
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
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.6);
    doc.line(M, H - 44, W - M, H - 44);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
    doc.text(
      "Student Dropout Risk Predictor - SEOK  |  Optimized Gradient Boosting Classifier  |  Decision-support only",
      M,
      H - 30,
    );
    doc.text(`Page ${doc.getNumberOfPages()}`, W - M, H - 30, { align: "right" });
  };

  // Header band
  doc.setFillColor(30, 45, 68);
  doc.rect(0, 0, W, 96, "F");
  doc.setFont("helvetica", "bold").setFontSize(17).setTextColor(255, 255, 255);
  doc.text("Student Dropout Risk Predictor - SEOK", M, 42);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(203, 216, 232);
  doc.text("Early Warning System Report - Optimized Gradient Boosting Classifier", M, 62);
  doc.text(
    `Generated: ${new Date().toLocaleString()}   |   Prepared by: ${preparedBy}`,
    M,
    78,
  );
  y = 128;

  // Verdict box
  const boxH = 76;
  doc.setFillColor(atRisk ? 253 : 240, atRisk ? 235 : 250, atRisk ? 236 : 245);
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
  y += boxH + 26;

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
  doc.setFontSize(9.5);
  rows.forEach((row, idx) => {
    ensure(20);
    if (idx % 2 === 0) {
      doc.setFillColor(247, 250, 252);
      doc.rect(M, y - 11, W - M * 2, 18, "F");
    }
    doc.setFont("helvetica", "normal").setTextColor(...INK);
    doc.text(row[0], M + 6, y);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], M + 250, y);
    doc.setFont("helvetica", "normal").setTextColor(...MUTED);
    doc.text(row[2], M + 340, y);
    y += 18;
  });
  y += 16;

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

  result.drivers.forEach((d) => {
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
  result.recommendations.forEach((rec, i) => {
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
  info.forEach((line) => {
    const body = doc.splitTextToSize(line, W - M * 2 - 8);
    ensure(body.length * 12 + 4);
    doc.text(body, M + 4, y);
    y += body.length * 12 + 4;
  });

  y += 10;
  ensure(40);
  doc.setFont("helvetica", "italic").setFontSize(8.5).setTextColor(...MUTED);
  const disclaimer = doc.splitTextToSize(
    "This report is generated from a statistical model trained on simulated data and is intended as decision support for school staff. It must be combined with professional judgement, and should never be the sole basis for any action affecting a student.",
    W - M * 2 - 8,
  );
  doc.text(disclaimer, M + 4, y);

  footer();
  return doc;
}

export function downloadReport(
  student: StudentRecord,
  result: PredictionResult,
  preparedBy: string,
) {
  const doc = buildReport(student, result, preparedBy);
  doc.save(`SEOK-dropout-risk-${student.student_id}.pdf`);
}
