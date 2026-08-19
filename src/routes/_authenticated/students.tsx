import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Save, Search, UserPlus, X } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { FEATURE_KEYS, FEATURE_META, predict, type FeatureVector } from "@/lib/model";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({
    meta: [
      { title: "Student records — Dropout Risk Predictor SEOK" },
      {
        name: "description",
        content:
          "Add new student records and edit existing ones: Student ID, age and the eight predictive features used by the SEOK dropout early warning model.",
      },
      { property: "og:title", content: "Student records — Dropout Risk Predictor SEOK" },
      {
        property: "og:description",
        content: "School administrators can enter and edit student records for risk screening.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentsPage,
});

type StudentRow = {
  id: string;
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

const COLUMN_OF: Record<string, keyof StudentRow> = {
  ParentInvolvement: "parent_involvement",
  PreviousFailures: "previous_failures",
  AssignmentCompletion: "assignment_completion",
  Attendance: "attendance",
  AcademicPerformance: "academic_performance",
  AverageScore: "average_score",
  EngagementScore: "engagement_score",
  StudyHours: "study_hours",
};

type FormState = {
  student_id: string;
  age: string;
  dropout: string;
} & Record<string, string>;

const blankForm = (): FormState => {
  const base: FormState = { student_id: "", age: "16", dropout: "0" };
  FEATURE_KEYS.forEach((k) => {
    base[k] = String(FEATURE_META[k].benchmark);
  });
  return base;
};

const formFromRow = (row: StudentRow): FormState => {
  const base: FormState = {
    student_id: row.student_id,
    age: String(row.age),
    dropout: String(row.dropout),
  };
  FEATURE_KEYS.forEach((k) => {
    base[k] = String(row[COLUMN_OF[k]!]);
  });
  return base;
};

function StudentsPage() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async (search: string) => {
    setLoading(true);
    let q = supabase
      .from("students")
      .select("*")
      .order("student_id", { ascending: true })
      .limit(50);
    const term = search.trim();
    if (term) q = q.ilike("student_id", `%${term}%`);
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as StudentRow[]);
  }, []);

  useEffect(() => {
    void load("");
  }, [load]);

  const startNew = () => {
    setEditingId(null);
    setErrors({});
    setForm(blankForm());
  };

  const startEdit = (row: StudentRow) => {
    setEditingId(row.id);
    setErrors({});
    setForm(formFromRow(row));
  };

  const setField = (key: string, value: string) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const validate = (f: FormState) => {
    const next: Record<string, string> = {};
    const id = f.student_id.trim().toUpperCase();
    if (!id) next["student_id"] = "Student ID is required";
    else if (!/^[A-Z0-9_-]{3,20}$/.test(id))
      next["student_id"] = "Use 3-20 letters, digits, dash or underscore (e.g. STU2101)";
    const age = Number(f.age);
    if (!Number.isFinite(age) || age < 10 || age > 25) next["age"] = "Age must be between 10 and 25";
    FEATURE_KEYS.forEach((k) => {
      const meta = FEATURE_META[k];
      const v = Number(f[k]);
      if (!Number.isFinite(v) || v < meta.min || v > meta.max)
        next[k] = `Must be between ${meta.min} and ${meta.max}`;
    });
    const d = Number(f.dropout);
    if (d !== 0 && d !== 1) next["dropout"] = "Dropout must be 0 or 1";
    setErrors(next);
    return Object.keys(next).length === 0 ? { id, age, dropout: d } : null;
  };

  const save = async () => {
    if (!form) return;
    const ok = validate(form);
    if (!ok) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSaving(true);
    const payload = {
      student_id: ok.id,
      age: ok.age,
      dropout: ok.dropout,
      parent_involvement: Number(form["ParentInvolvement"]),
      previous_failures: Number(form["PreviousFailures"]),
      assignment_completion: Number(form["AssignmentCompletion"]),
      attendance: Number(form["Attendance"]),
      academic_performance: Number(form["AcademicPerformance"]),
      average_score: Number(form["AverageScore"]),
      engagement_score: Number(form["EngagementScore"]),
      study_hours: Number(form["StudyHours"]),
    };

    if (editingId) {
      const { error } = await supabase.from("students").update(payload).eq("id", editingId);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`${ok.id} updated`);
    } else {
      const { error } = await supabase.from("students").insert(payload);
      setSaving(false);
      if (error) {
        toast.error(
          error.code === "23505" || error.message.includes("duplicate")
            ? `A record for ${ok.id} already exists — search for it and edit instead.`
            : error.message,
        );
        return;
      }
      toast.success(`${ok.id} added to the records`);
    }
    setForm(null);
    setEditingId(null);
    await load(query);
  };

  const preview = useMemo(() => {
    if (!form) return null;
    const vector = FEATURE_KEYS.reduce((acc, k) => {
      acc[k] = Number(form[k]) || 0;
      return acc;
    }, {} as FeatureVector);
    try {
      return predict(vector);
    } catch {
      return null;
    }
  }, [form]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Student records</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Administrators can enter new students and edit existing records. Every record stores
              the Student ID, age and the eight model features in order.
            </p>
          </div>
          <Button onClick={startNew}>
            <UserPlus className="size-4" />
            New student
          </Button>
        </div>

        {form && (
          <Card className="mt-8 border-border/70 bg-panel-gradient shadow-soft">
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">
                  {editingId ? `Edit ${form.student_id}` : "Enter a new student record"}
                </CardTitle>
                <CardDescription>
                  Values are validated against the model's accepted ranges before saving.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setForm(null);
                  setEditingId(null);
                }}
              >
                <X className="size-4" />
                Cancel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="student_id">Student ID</Label>
                  <Input
                    id="student_id"
                    value={form.student_id}
                    onChange={(e) => setField("student_id", e.target.value)}
                    placeholder="STU2101"
                    disabled={!!editingId}
                    aria-invalid={!!errors["student_id"]}
                  />
                  {errors["student_id"] && (
                    <p className="text-xs text-destructive">{errors["student_id"]}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={form.age}
                    onChange={(e) => setField("age", e.target.value)}
                    aria-invalid={!!errors["age"]}
                  />
                  {errors["age"] && <p className="text-xs text-destructive">{errors["age"]}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dropout">Known outcome (Dropout 0/1)</Label>
                  <Input
                    id="dropout"
                    type="number"
                    min={0}
                    max={1}
                    value={form.dropout}
                    onChange={(e) => setField("dropout", e.target.value)}
                    aria-invalid={!!errors["dropout"]}
                  />
                  {errors["dropout"] && (
                    <p className="text-xs text-destructive">{errors["dropout"]}</p>
                  )}
                </div>

                {FEATURE_KEYS.map((key, i) => {
                  const meta = FEATURE_META[key];
                  return (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={key}>
                        {i + 1}. {meta.label}{" "}
                        <span className="text-muted-foreground">{meta.unit}</span>
                      </Label>
                      <Input
                        id={key}
                        type="number"
                        step={meta.step}
                        min={meta.min}
                        max={meta.max}
                        value={form[key]}
                        onChange={(e) => setField(key, e.target.value)}
                        aria-invalid={!!errors[key]}
                      />
                      {errors[key] ? (
                        <p className="text-xs text-destructive">{errors[key]}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{meta.help}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {editingId ? "Save changes" : "Add student"}
                </Button>
                {preview && (
                  <Badge variant={preview.label === 1 ? "destructive" : "secondary"}>
                    Live model preview: {preview.label === 1 ? "At Risk (1)" : "Not At Risk (0)"} ·{" "}
                    {(preview.probability * 100).toFixed(1)}%
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mt-8 border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Existing records</CardTitle>
            <CardDescription>
              Search by Student ID, then edit any record. Showing up to 50 matches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1 space-y-1.5">
                <Label htmlFor="search">Search Student ID</Label>
                <Input
                  id="search"
                  value={query}
                  placeholder="e.g. STU10"
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void load(query);
                  }}
                />
              </div>
              <Button variant="outline" onClick={() => void load(query)} disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                Search
              </Button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">Student ID</th>
                    <th className="py-2 pr-3">Age</th>
                    <th className="py-2 pr-3">Attendance</th>
                    <th className="py-2 pr-3">Avg score</th>
                    <th className="py-2 pr-3">Failures</th>
                    <th className="py-2 pr-3">Outcome</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-medium">{row.student_id}</td>
                      <td className="py-2 pr-3">{row.age}</td>
                      <td className="py-2 pr-3">{Number(row.attendance).toFixed(0)}%</td>
                      <td className="py-2 pr-3">{Number(row.average_score).toFixed(0)}</td>
                      <td className="py-2 pr-3">{row.previous_failures}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={row.dropout === 1 ? "destructive" : "secondary"}>
                          {row.dropout === 1 ? "Dropped out" : "Retained"}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(row)}>
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No records match “{query}”.{" "}
                        <button
                          type="button"
                          className="underline underline-offset-4"
                          onClick={startNew}
                        >
                          Add a new student
                        </button>
                        .
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!form && (
              <Button variant="outline" className="mt-6" onClick={startNew}>
                <Plus className="size-4" />
                Add another student
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
