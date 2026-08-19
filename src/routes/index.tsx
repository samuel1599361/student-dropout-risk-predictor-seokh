import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  FileDown,
  GraduationCap,
  ShieldCheck,
  Target,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FEATURE_KEYS, FEATURE_META, MODEL_METRICS } from "@/lib/model";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Student Dropout Risk Predictor - SEOK Early Warning System" },
      {
        name: "description",
        content:
          "Predict student dropout risk with an optimized Gradient Boosting model. Enter a Student ID, get an explained risk verdict and a downloadable PDF intervention report.",
      },
      {
        property: "og:title",
        content: "Student Dropout Risk Predictor - SEOK Early Warning System",
      },
      {
        property: "og:description",
        content:
          "An early warning system for school staff: explained dropout risk predictions and downloadable intervention reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const METRIC_CARDS = [
  { label: "Accuracy", value: `${(MODEL_METRICS.accuracy * 100).toFixed(1)}%` },
  { label: "ROC-AUC", value: MODEL_METRICS.roc_auc.toFixed(3) },
  { label: "Precision", value: `${(MODEL_METRICS.precision * 100).toFixed(1)}%` },
  { label: "F1 score", value: `${(MODEL_METRICS.f1 * 100).toFixed(1)}%` },
];

const FEATURES = [
  {
    icon: Target,
    title: "Binary risk verdict",
    body: "Every student is classified as At Risk of Dropout (1) or Not At Risk of Dropout (0) with a calibrated probability and risk band.",
  },
  {
    icon: Activity,
    title: "Explained, not opaque",
    body: "Each prediction is broken down by counterfactual attribution, showing exactly how many risk points each factor contributes.",
  },
  {
    icon: FileDown,
    title: "PDF case reports",
    body: "Download a formatted report with student details, the verdict, the reasoning and prioritised interventions.",
  },
  {
    icon: BarChart3,
    title: "Cohort insights",
    body: "Monitor dropout prevalence, factor importance and your own prediction history across the 1,000-record cohort.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <AppHeader />

      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-ink-foreground/25 bg-ink-foreground/10 px-3 py-1 text-xs font-semibold tracking-wide text-ink-foreground">
              <ShieldCheck className="size-3.5" />
              Optimized Gradient Boosting Classifier
            </span>
            <h1 className="mt-6 text-balance-tight text-4xl font-bold text-ink-foreground sm:text-6xl">
              Student Dropout Risk Predictor
              <span className="block text-ink-foreground/70">— SEOK</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-foreground/80">
              An early warning system for school administrators. Enter a Student ID, and the
              model returns an explained dropout risk verdict with prioritised interventions
              you can download as a PDF.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/auth">Get started</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/auth" search={{ mode: "signin" }}>
                  Staff sign in
                </Link>
              </Button>
            </div>

            <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
              {METRIC_CARDS.map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl border border-ink-foreground/15 bg-ink-foreground/10 p-4"
                >
                  <dt className="text-xs font-medium uppercase tracking-wider text-ink-foreground/65">
                    {m.label}
                  </dt>
                  <dd className="mt-1 font-display text-2xl font-bold text-ink-foreground">
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold">Built for early intervention</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          The system pairs a tuned machine learning classifier with the practical
          information a pastoral team needs to act within days, not terms.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Card key={f.title} className="border-border/70 bg-panel-gradient shadow-soft">
              <CardContent className="flex gap-4 p-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-secondary/50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold">The eight predictive features</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Used in this exact order by the model, alongside Student ID as identifier and
            Dropout as the target variable.
          </p>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_KEYS.map((key, i) => (
              <li
                key={key}
                className="rounded-xl border border-border bg-card p-4 shadow-soft"
              >
                <span className="font-display text-xs font-bold text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-1 font-semibold">{FEATURE_META[key].label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{FEATURE_META[key].help}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-12 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2">
          <GraduationCap className="size-4" />
          Student Dropout Risk Predictor — SEOK
        </span>
        <span>Decision support only. Always combine with professional judgement.</span>
      </footer>
    </div>
  );
}
