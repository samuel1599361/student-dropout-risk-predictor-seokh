import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { FEATURE_IMPORTANCE, FEATURE_KEYS, FEATURE_META, MODEL_METRICS } from "@/lib/model";

export const Route = createFileRoute("/_authenticated/insights")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cohort insights — Dropout Risk Predictor SEOK" },
      {
        name: "description",
        content:
          "Model performance, factor importance, cohort dropout prevalence and your recent prediction history in the SEOK Early Warning System.",
      },
      { property: "og:title", content: "Cohort insights — Dropout Risk Predictor SEOK" },
      {
        property: "og:description",
        content: "Model performance and cohort dropout analytics for school staff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InsightsPage,
});

const cohortQuery = {
  queryKey: ["cohort-insights"],
  queryFn: async () => {
    const [{ count: total }, { count: dropouts }, history] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("students").select("*", { count: "exact", head: true }).eq("dropout", 1),
      supabase
        .from("predictions")
        .select("student_id, probability, prediction, risk_band, created_at")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    return {
      total: total ?? 0,
      dropouts: dropouts ?? 0,
      history: history.data ?? [],
    };
  },
};

function InsightsPage() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold">Cohort insights</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          How the optimized Random Forest classifier performs, which factors carry the most
          predictive weight, and what your team has been screening. Scores come from a
          low-noise simulated cohort, so they are not a forecast of field accuracy.
        </p>

        <Suspense
          fallback={
            <div className="flex items-center gap-2 py-20 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading cohort data…
            </div>
          }
        >
          <InsightsBody />
        </Suspense>
      </main>
    </div>
  );
}

function InsightsBody() {
  const { data } = useSuspenseQuery(cohortQuery);
  const prevalence = data.total ? (data.dropouts / data.total) * 100 : 0;
  const maxImportance = Math.max(...Object.values(FEATURE_IMPORTANCE));

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Student records" value={data.total.toLocaleString()} hint="Simulated cohort" />
        <Stat
          label="Recorded dropouts"
          value={data.dropouts.toLocaleString()}
          hint={`${prevalence.toFixed(1)}% prevalence`}
        />
        <Stat
          label="Model ROC-AUC"
          value={MODEL_METRICS.roc_auc.toFixed(3)}
          hint="Held-out test split"
        />
        <Stat
          label="Model accuracy"
          value={`${(MODEL_METRICS.accuracy * 100).toFixed(1)}%`}
          hint={`F1 ${(MODEL_METRICS.f1 * 100).toFixed(1)}%`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-border/70 shadow-soft lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Factor importance</CardTitle>
            <CardDescription>
              Relative contribution of each input feature to the trained classifier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {FEATURE_KEYS.map((key, i) => {
              const value = FEATURE_IMPORTANCE[key] ?? 0;
              return (
                <div key={key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">
                      {i + 1}. {FEATURE_META[key].label}
                    </span>
                    <span className="font-display font-bold">
                      {(value * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(2, (value / maxImportance) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-panel-gradient shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Model card</CardTitle>
            <CardDescription>Training and validation summary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Algorithm" value="Optimized Random Forest Classifier" />
            <Row label="Task" value="Binary classification" />
            <Row label="Target" value="Dropout (0 / 1)" />
            <Row label="Identifier" value="Student ID" />
            <Row label="Input features" value="8 (fixed order)" />
            <Row label="Precision" value={`${(MODEL_METRICS.precision * 100).toFixed(1)}%`} />
            <Row label="Recall" value={`${(MODEL_METRICS.recall * 100).toFixed(1)}%`} />
            <Row label="Decision threshold" value="0.50" />
            <div>
              <p className="text-muted-foreground">Cohort dropout prevalence</p>
              <Progress value={prevalence} className="mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Why Random Forest was selected</CardTitle>
          <CardDescription>
            Ten algorithms were trained, tuned and compared on the same cohort and split.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Random Forest achieved near-perfect performance (accuracy{" "}
            {(MODEL_METRICS.accuracy * 100).toFixed(1)}%, ROC-AUC{" "}
            {MODEL_METRICS.roc_auc.toFixed(4)}) and was selected as the final model because it{" "}
            <span className="font-medium text-foreground">matched</span> the top-performing
            algorithms rather than beating them. On this low-noise simulated cohort several
            candidates — Logistic Regression, Naive Bayes, k-NN, SVM (RBF), AdaBoost and an MLP
            — saturate at perfect scores, so the choice was decided on non-accuracy criteria:
          </p>
          <ul className="ml-4 list-disc space-y-1.5">
            <li>Out-of-bag validation built into bagging, alongside cross-validation.</li>
            <li>Stability under label-noise stress tests and reseeded splits.</li>
            <li>
              Native impurity-based factor importance, which powers the driver explanations in
              this app and in the PDF reports.
            </li>
            <li>No feature scaling required across the mixed feature ranges.</li>
            <li>Compact tree structure that exports cleanly for in-browser inference.</li>
          </ul>
          <p>
            Only the single Decision Tree is materially weaker. Because the cohort is simulated
            and low-noise, these results should not be read as evidence that Random Forest is
            superior on real school records.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Your recent predictions</CardTitle>
          <CardDescription>The last 12 screenings you ran.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.history.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No predictions yet. Run one from the Predict page and it will appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Student ID</th>
                    <th className="py-2 pr-4 font-medium">Verdict</th>
                    <th className="py-2 pr-4 font-medium">Probability</th>
                    <th className="py-2 pr-4 font-medium">Band</th>
                    <th className="py-2 font-medium">Screened</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((h, i) => (
                    <tr key={`${h.student_id}-${i}`} className="border-b border-border/60">
                      <td className="py-2.5 pr-4 font-display font-bold">{h.student_id}</td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={h.prediction === 1 ? "destructive" : "secondary"}>
                          {h.prediction === 1 ? "At Risk (1)" : "Not At Risk (0)"}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4">
                        {(Number(h.probability) * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{h.risk_band}</td>
                      <td className="py-2.5 text-muted-foreground">
                        {new Date(h.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="border-border/70 shadow-soft">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-display text-3xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
