import { FEATURE_KEYS, FEATURE_META, predict, type FeatureVector, type PredictionResult } from "./model";
import type { StudentRecord } from "./report";

export type BulkRow = {
  student: StudentRecord;
  result: PredictionResult;
};

export type ParseIssue = { line: number; message: string };

export type ParsedBulk = {
  rows: BulkRow[];
  issues: ParseIssue[];
  headers: string[];
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const COLUMN_ALIASES: Record<string, string> = {
  studentid: "student_id",
  id: "student_id",
  student: "student_id",
  age: "age",
  parentinvolvement: "ParentInvolvement",
  previousfailures: "PreviousFailures",
  assignmentcompletion: "AssignmentCompletion",
  attendance: "Attendance",
  academicperformance: "AcademicPerformance",
  averagescore: "AverageScore",
  engagementscore: "EngagementScore",
  studyhours: "StudyHours",
};

export const CSV_TEMPLATE_HEADERS = [
  "StudentID",
  "Age",
  ...FEATURE_KEYS,
] as string[];

export function csvTemplate(): string {
  const sample = [
    "STU9001",
    "16",
    ...FEATURE_KEYS.map((k) => String(FEATURE_META[k].benchmark)),
  ];
  return `${CSV_TEMPLATE_HEADERS.join(",")}\n${sample.join(",")}\n`;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseBulkCsv(text: string): ParsedBulk {
  const issues: ParseIssue[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], issues: [{ line: 0, message: "The file is empty." }], headers: [] };
  }

  const rawHeaders = splitCsvLine(lines[0]!);
  const headers = rawHeaders.map((h) => COLUMN_ALIASES[norm(h)] ?? norm(h));

  const missing = ["student_id", ...FEATURE_KEYS].filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    return {
      rows: [],
      issues: [
        {
          line: 1,
          message: `Missing required column(s): ${missing
            .map((m) => (m === "student_id" ? "StudentID" : m))
            .join(", ")}`,
        },
      ],
      headers: rawHeaders,
    };
  }

  const rows: BulkRow[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]!);
    const get = (col: string) => {
      const idx = headers.indexOf(col);
      return idx === -1 ? "" : (cells[idx] ?? "");
    };

    const studentId = get("student_id").toUpperCase();
    if (!studentId) {
      issues.push({ line: i + 1, message: "Missing Student ID — row skipped." });
      continue;
    }
    if (seen.has(studentId)) {
      issues.push({ line: i + 1, message: `Duplicate Student ID ${studentId} — row skipped.` });
      continue;
    }

    let bad: string | null = null;
    const features = {} as FeatureVector;
    for (const key of FEATURE_KEYS) {
      const value = Number(get(key));
      if (!Number.isFinite(value)) {
        bad = key;
        break;
      }
      const meta = FEATURE_META[key];
      features[key] = Math.min(meta.max, Math.max(meta.min, value));
    }
    if (bad) {
      issues.push({ line: i + 1, message: `${studentId}: invalid or missing value for ${bad} — row skipped.` });
      continue;
    }

    const ageRaw = Number(get("age"));
    const age = Number.isFinite(ageRaw) && ageRaw > 0 ? ageRaw : 16;

    const student: StudentRecord = { student_id: studentId, age, ...features };
    seen.add(studentId);
    rows.push({ student, result: predict(features) });
  }

  return { rows, issues, headers: rawHeaders };
}

export function resultsToCsv(rows: BulkRow[]): string {
  const header = [
    "StudentID",
    "Age",
    ...FEATURE_KEYS,
    "RiskProbability",
    "Prediction",
    "Verdict",
    "RiskBand",
    "TopRiskFactors",
    "PriorityRecommendations",
  ];
  const body = rows.map(({ student, result }) => {
    const drivers = result.drivers
      .filter((d) => d.impact > 0.5)
      .slice(0, 3)
      .map((d) => `${d.label} (+${d.impact.toFixed(1)}pp)`)
      .join(" | ");
    const recs = result.recommendations.slice(0, 3).join(" | ");
    const cells = [
      student.student_id,
      String(student.age),
      ...FEATURE_KEYS.map((k) => String(student[k])),
      (result.probability * 100).toFixed(2),
      String(result.label),
      result.label === 1 ? "At Risk of Dropout" : "Not At Risk of Dropout",
      result.band,
      drivers,
      recs,
    ];
    return cells
      .map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c))
      .join(",");
  });
  return `${header.join(",")}\n${body.join("\n")}\n`;
}

export function downloadTextFile(name: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
