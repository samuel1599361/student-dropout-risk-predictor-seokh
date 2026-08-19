import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, FileDown, Loader2, RefreshCw, Search, Sparkles, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  FEATURE_KEYS,
  FEATURE_META,
  predict,
  type FeatureKey,
  type FeatureVector,
  type PredictionResult,
} from "@/lib/model";
import { downloadReport, type StudentRecord } from "@/lib/report";

export const Route = createFileRoute("/_authenticated/predict")({
  head: () => ({
    meta: [
      { title: "Run a prediction — Dropout Risk Predictor SEOK" },
      {
        name: "description",
        content:
          "Enter a Student ID to generate an explained dropout risk prediction and download the PDF intervention report.",
      },
      { property: "og:title", content: "Run a prediction — Dropout Risk Predictor SEOK" },
      {
        property: "og:description",
        content: "Explained dropout risk predictions for school staff, with PDF reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PredictPage,
});

type Row = {
  student_id: string;
  age: number;
  parent_involvement: number;
  previous_failures: number;
  assignment_completion: number;
  attendance: number;
  academic_performance: number;
  average_score: number;
  engagement_score: number;
  study_hours: number;
  dropout: number;
};

const rowToStudent = (row: Row): StudentRecord => ({
  student_id: row.student_id,
  age: Number(row.age),
  ParentInvolvement: Number(row.parent_involvement),
  PreviousFailures: Number(row.previous_failures),
  AssignmentCompletion: Number(row.assignment_completion),
  Attendance: Number(row.attendance),
  AcademicPerformance: Number(row.academic_performance),
  AverageScore: Number(row.average_score),
  EngagementScore: Number(row.engagement_score),
  StudyHours: Number(row.study_hours),
  dropout: Number(row.dropout),
});

const EMPTY: StudentRecord = {
  student_id: "",
  age: 16,
  ParentInvolvement: 3,
  PreviousFailures: 0,
  AssignmentCompletion: 80,
  Attendance: 88,
  AcademicPerformance: 70,
  AverageScore: 70,
  EngagementScore: 68,
  StudyHours: 12,
};

function PredictPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(false);

  const preparedBy =
    (user?.user_metadata?.["full_name"] as string | undefined) || user?.email || "School staff";

  const featuresOf = (s: StudentRecord): FeatureVector =>
    FEATURE_KEYS.reduce((acc, key) => {
      acc[key] = Number(s[key]);
      return acc;
    }, {} as FeatureVector);

  const logPrediction = async (s: StudentRecord, r: PredictionResult) => {
    if (!user) return;
    await supabase.from("predictions").insert({
      user_id: user.id,
      student_id: s.student_id || "manual-entry",
      probability: Number(r.probability.toFixed(4)),
      prediction: r.label,
      risk_band: r.band,
    });
  };

  const runFor = async (s: StudentRecord) => {
    const r = predict(featuresOf(s));
    setStudent(s);
    setResult(r);
    await logPrediction(s, r);
  };

  const lookupAndPredict = async () => {
    const id = query.trim().toUpperCase();
    if (!id) {
      toast.error("Enter a Student ID first");
      return;
    }
    setLoading(true);
    setResult(null);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("student_id", id)
      .maybeSingle();
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.error(`No record found for ${id}. Try IDs from STU1001 to STU2000.`);
      return;
    }
    setManual(false);
    await runFor(rowToStudent(data as Row));
  };

  const atRisk = result?.label === 1;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dropout risk prediction</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Look up a student from the records, or enter the eight features manually. The
              optimized Gradient Boosting classifier returns the verdict, the reasoning and
              recommended interventions.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setManual((m) => !m);
              setResult(null);
              setStudent(manual ? null : { ...EMPTY });
            }}
          >
            <RefreshCw className="size-4" />
            {manual ? "Use student records" : "Manual entry"}
          </Button>
        </div>

        <Card className="mt-8 border-border/70 bg-panel-gradient shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">
              {manual ? "Enter student information" : "Find a student"}
            </CardTitle>
            <CardDescription>
              {manual
                ? "All eight input features are used in the model's required order."
                : "1,000 student records are available, from STU1001 to STU2000."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!manual ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-56 flex-1 space-y-1.5">
                  <Label htmlFor="sid">Student ID</Label>
                  <Input
                    id="sid"
                    value={query}
                    placeholder="e.g. STU1042"
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void lookupAndPredict();
                    }}
                  />
                </div>
                <Button onClick={() => void lookupAndPredict()} disabled={loading}>
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  Predict
                </Button>
              </div>
            ) : (
              <ManualForm
                onPredict={(s) => {
                  void runFor(s);
                }}
              />
            )}
          </CardContent>
        </Card>

        {student && result && (
          <div className="mt-8 space-y-6">
            <Card
              className={`overflow-hidden border-2 shadow-elevated ${
                atRisk ? "border-risk bg-risk-soft" : "border-safe bg-safe-soft"
              }`}
            >
              <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
                <span
                  className={`flex size-20 shrink-0 items-center justify-center rounded-2xl border-2 ${
                    atRisk ? "border-risk text-risk" : "border-safe text-safe"
                  }`}
                >
                  {atRisk ? (
                    <X className="size-12" strokeWidth={3.5} />
                  ) : (
                    <Check className="size-12" strokeWidth={3.5} />
                  )}
                </span>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Prediction for {student.student_id || "manual entry"}
                  </p>
                  <h2
                    className={`mt-1 text-2xl font-bold sm:text-3xl ${
                      atRisk ? "text-risk" : "text-safe"
                    }`}
                  >
                    {atRisk ? "At Risk of Dropout (1)" : "Not At Risk of Dropout (0)"}
                  </h2>
                  <div className="mt-4 max-w-md">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Risk probability</span>
                      <span className="font-display font-bold">
                        {(result.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={result.probability * 100} className="mt-2" />
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={atRisk ? "destructive" : "secondary"}>
                        {result.band} risk band
                      </Badge>
                      <span>Decision threshold 50%</span>
                    </div>
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={() => {
                    downloadReport(student, result, preparedBy);
                    toast.success("PDF report downloaded");
                  }}
                >
                  <FileDown className="size-4" />
                  Download PDF report
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="border-border/70 shadow-soft lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Student details</CardTitle>
                  <CardDescription>Identifier, age and the eight input features.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <DetailRow label="Student ID" value={student.student_id || "—"} strong />
                  <DetailRow label="Age" value={`${student.age} years`} />
                  <Separator className="my-2" />
                  {FEATURE_KEYS.map((key, i) => (
                    <DetailRow
                      key={key}
                      label={`${i + 1}. ${FEATURE_META[key].label}`}
                      value={`${Number(student[key]).toFixed(
                        FEATURE_META[key].step < 1 ? 1 : 0,
                      )} ${FEATURE_META[key].unit}`}
                    />
                  ))}
                  {student.dropout !== undefined && student.dropout !== null && (
                    <>
                      <Separator className="my-2" />
                      <DetailRow
                        label="Recorded outcome (Dropout)"
                        value={student.dropout === 1 ? "1 — dropped out" : "0 — retained"}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-soft lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Why {atRisk ? "this student is at risk" : "this student is not at risk"}
                  </CardTitle>
                  <CardDescription>
                    Each factor's contribution is measured by re-scoring the student with that
                    single factor moved to the cohort benchmark.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.drivers.map((d) => {
                    const up = d.impact >= 0;
                    const width = Math.min(100, (Math.abs(d.impact) / 40) * 100);
                    return (
                      <div key={d.key}>
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm font-semibold">{d.label}</p>
                          <span
                            className={`font-display text-sm font-bold ${
                              up ? "text-risk" : "text-safe"
                            }`}
                          >
                            {up ? "+" : ""}
                            {d.impact.toFixed(1)} pts
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${up ? "bg-risk" : "bg-safe"}`}
                            style={{ width: `${Math.max(2, width)}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Value {d.value.toFixed(1)} vs benchmark {d.benchmark} — {d.reason}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/70 bg-panel-gradient shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="size-4 text-primary" />
                  Recommended interventions
                </CardTitle>
                <CardDescription>
                  Prioritised by the factors contributing most to this student's risk.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {result.recommendations.map((rec, i) => (
                    <li key={rec} className="flex gap-3 text-sm">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent font-display text-xs font-bold text-accent-foreground">
                        {i + 1}
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function DetailRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5 odd:bg-muted/40">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-display font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}

function ManualForm({ onPredict }: { onPredict: (s: StudentRecord) => void }) {
  const [form, setForm] = useState<StudentRecord>({ ...EMPTY });

  const set = (key: keyof StudentRecord, value: string) =>
    setForm((f) => ({ ...f, [key]: key === "student_id" ? value : Number(value) }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onPredict(form);
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="m-sid">Student ID</Label>
          <Input
            id="m-sid"
            value={form.student_id}
            onChange={(e) => set("student_id", e.target.value)}
            placeholder="STU9001"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-age">Age</Label>
          <Input
            id="m-age"
            type="number"
            min={10}
            max={25}
            value={form.age}
            onChange={(e) => set("age", e.target.value)}
            required
          />
        </div>
        {FEATURE_KEYS.map((key: FeatureKey, i) => {
          const meta = FEATURE_META[key];
          return (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`m-${key}`}>
                {i + 1}. {meta.label}{" "}
                <span className="text-xs font-normal text-muted-foreground">{meta.unit}</span>
              </Label>
              <Input
                id={`m-${key}`}
                type="number"
                min={meta.min}
                max={meta.max}
                step={meta.step}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">{meta.help}</p>
            </div>
          );
        })}
      </div>
      <Button type="submit">
        <Search className="size-4" />
        Predict
      </Button>
    </form>
  );
}
