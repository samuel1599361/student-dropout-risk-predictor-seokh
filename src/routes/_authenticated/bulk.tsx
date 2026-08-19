import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  csvTemplate,
  downloadTextFile,
  parseBulkCsv,
  resultsToCsv,
  type BulkRow,
  type ParseIssue,
} from "@/lib/bulk";
import { downloadReport } from "@/lib/report";

export const Route = createFileRoute("/_authenticated/bulk")({
  head: () => ({
    meta: [
      { title: "Bulk CSV predictions — Dropout Risk Predictor SEOK" },
      {
        name: "description",
        content:
          "Upload a CSV of students to score the whole cohort at once, review risk verdicts in a table, and download the results file or per-student PDF reports.",
      },
      { property: "og:title", content: "Bulk CSV predictions — Dropout Risk Predictor SEOK" },
      {
        property: "og:description",
        content:
          "Score an entire student cohort from one CSV upload, with downloadable results and PDF reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BulkPage,
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function BulkPage() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [issues, setIssues] = useState<ParseIssue[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<"all" | "risk" | "safe">("all");

  const preparedBy =
    (user?.user_metadata?.["full_name"] as string | undefined) || user?.email || "School staff";

  const atRiskCount = rows.filter((r) => r.result.label === 1).length;

  const visible = useMemo(
    () =>
      rows
        .filter((r) =>
          filter === "all" ? true : filter === "risk" ? r.result.label === 1 : r.result.label === 0,
        )
        .sort((a, b) => b.result.probability - a.result.probability),
    [rows, filter],
  );

  const handleFile = async (file: File) => {
    setBusy(true);
    setRows([]);
    setIssues([]);
    try {
      const text = await file.text();
      const parsed = parseBulkCsv(text);
      setFileName(file.name);
      setRows(parsed.rows);
      setIssues(parsed.issues);
      if (parsed.rows.length === 0) {
        toast.error(parsed.issues[0]?.message ?? "No valid rows found in that file.");
      } else {
        toast.success(`Scored ${parsed.rows.length} student${parsed.rows.length === 1 ? "" : "s"}`);
        if (user) {
          await supabase.from("predictions").insert(
            parsed.rows.slice(0, 500).map(({ student, result }) => ({
              user_id: user.id,
              student_id: student.student_id,
              probability: Number(result.probability.toFixed(4)),
              prediction: result.label,
              risk_band: result.band,
            })),
          );
        }
      }
    } catch {
      toast.error("Could not read that file. Upload a plain .csv export.");
    } finally {
      setBusy(false);
    }
  };

  const downloadAll = async (subset: BulkRow[]) => {
    if (subset.length === 0) return;
    setExporting(true);
    for (const row of subset) {
      downloadReport(row.student, row.result, preparedBy);
      await sleep(250);
    }
    setExporting(false);
    toast.success(`${subset.length} PDF report${subset.length === 1 ? "" : "s"} generated`);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <Badge variant="secondary" className="mb-3">
            Batch screening
          </Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Bulk student prediction
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Upload a CSV containing StudentID, Age and the eight predictive features. Every row is
            scored with the optimized Random Forest classifier, and results are returned as a
            downloadable table plus per-student PDF intervention reports.
          </p>
        </header>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">1. Upload your cohort file</CardTitle>
            <CardDescription>
              Required columns: StudentID, ParentInvolvement, PreviousFailures,
              AssignmentCompletion, Attendance, AcademicPerformance, AverageScore, EngagementScore,
              StudyHours. Age is optional (defaults to 16).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
            <Button onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {busy ? "Scoring…" : "Upload CSV"}
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadTextFile("SEOK-bulk-template.csv", csvTemplate())}
            >
              <FileSpreadsheet className="size-4" />
              Download CSV template
            </Button>
            {fileName ? (
              <span className="text-xs text-muted-foreground">
                Loaded <span className="font-medium text-foreground">{fileName}</span>
              </span>
            ) : null}
          </CardContent>
        </Card>

        {issues.length > 0 ? (
          <Card className="mb-8 border-destructive/40">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="size-4" />
                {issues.length} row issue{issues.length === 1 ? "" : "s"} skipped
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              {issues.slice(0, 8).map((issue) => (
                <p key={`${issue.line}-${issue.message}`}>
                  Line {issue.line}: {issue.message}
                </p>
              ))}
              {issues.length > 8 ? <p>…and {issues.length - 8} more.</p> : null}
            </CardContent>
          </Card>
        ) : null}

        {rows.length > 0 ? (
          <Card>
            <CardHeader className="gap-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <CardTitle className="text-base">2. Results</CardTitle>
                  <CardDescription>
                    {rows.length} scored ·{" "}
                    <span className="font-semibold text-destructive">{atRiskCount} at risk</span> ·{" "}
                    {rows.length - atRiskCount} not at risk
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadTextFile(
                        `SEOK-bulk-results-${new Date().toISOString().slice(0, 10)}.csv`,
                        resultsToCsv(visible),
                      )
                    }
                  >
                    <Download className="size-4" />
                    Results table (CSV)
                  </Button>
                  <Button
                    size="sm"
                    disabled={exporting || atRiskCount === 0}
                    onClick={() => void downloadAll(rows.filter((r) => r.result.label === 1))}
                  >
                    {exporting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <FileDown className="size-4" />
                    )}
                    PDFs for at-risk students
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                {(["all", "risk", "safe"] as const).map((key) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={filter === key ? "secondary" : "ghost"}
                    onClick={() => setFilter(key)}
                  >
                    {key === "all" ? "All" : key === "risk" ? "At risk" : "Not at risk"}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Student ID</th>
                    <th className="px-4 py-3 font-medium">Age</th>
                    <th className="px-4 py-3 font-medium">Risk</th>
                    <th className="px-4 py-3 font-medium">Band</th>
                    <th className="px-4 py-3 font-medium">Verdict</th>
                    <th className="px-4 py-3 font-medium">Top risk factor</th>
                    <th className="px-4 py-3 text-right font-medium">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(({ student, result }) => {
                    const atRisk = result.label === 1;
                    const top = result.drivers[0];
                    return (
                      <tr key={student.student_id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3 font-medium">{student.student_id}</td>
                        <td className="px-4 py-3 text-muted-foreground">{student.age}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                              <span
                                className={`block h-full rounded-full ${atRisk ? "bg-destructive" : "bg-primary"}`}
                                style={{ width: `${Math.round(result.probability * 100)}%` }}
                              />
                            </span>
                            <span className="tabular-nums text-xs text-muted-foreground">
                              {(result.probability * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{result.band}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 font-semibold ${atRisk ? "text-destructive" : "text-primary"}`}
                          >
                            {atRisk ? <X className="size-4" /> : <Check className="size-4" />}
                            {atRisk ? "At Risk of Dropout (1)" : "Not At Risk (0)"}
                          </span>
                        </td>
                        <td className="max-w-[220px] px-4 py-3 text-xs text-muted-foreground">
                          {top && top.impact > 0.5
                            ? `${top.label} (+${top.impact.toFixed(1)}pp)`
                            : "No dominant risk factor"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadReport(student, result, preparedBy)}
                          >
                            <FileDown className="size-4" />
                            PDF
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
