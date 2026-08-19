import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  GraduationCap,
  HelpCircle,
  Layout,
  Lock,
  LogIn,
  Settings,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FEATURE_KEYS, FEATURE_META } from "@/lib/model";

const HOW_IT_WORKS = [
  {
    icon: GraduationCap,
    title: "Sign in",
    body: "Use your school email or Google account. If you signed up with Google, use the Google button.",
  },
  {
    icon: CheckCircle2,
    title: "Predict",
    body: "Enter a Student ID or type the eight features manually. Click Predict to get a probability and risk band.",
  },
  {
    icon: XCircle,
    title: "Review the verdict",
    body: "Red X means At Risk; teal check means Not At Risk. Check the drivers and recommendations before acting.",
  },
  {
    icon: FileSpreadsheet,
    title: "Bulk CSV",
    body: "Upload a whole database, filter results, and export or batch-download PDF reports.",
  },
];

const ROUTE_GUIDE = [
  {
    icon: Layout,
    title: "Home (/)",
    body: "The landing page with an overview of SEOKH, how it works, and the feature ranges.",
  },
  {
    icon: LogIn,
    title: "Auth (/auth)",
    body: "Where staff sign up or sign in with email/password or Google. Choose the same method you used when you registered.",
  },
  {
    icon: CheckCircle2,
    title: "Predict (/predict)",
    body: "Look up a single student by ID or enter the eight features manually, then get a risk verdict and downloadable PDF report.",
  },
  {
    icon: FileSpreadsheet,
    title: "Bulk CSV (/bulk)",
    body: "Upload a CSV file with many students at once, screen them all, filter the results, and export PDFs or tables.",
  },
  {
    icon: GraduationCap,
    title: "Insights (/insights)",
    body: "A dashboard showing the database summary, dropout statistics, model performance metrics, and key risk factors.",
  },
  {
    icon: Users,
    title: "Students (/students)",
    body: "Search, add, or edit student records (Student ID, Age, and the eight predictive features) stored in the database.",
  },
  {
    icon: Settings,
    title: "Template (/template)",
    body: "Customise the PDF reports: upload your school logo, set header/footer text, choose colours, and pick a 1-page or 2-page layout.",
  },
  {
    icon: Lock,
    title: "Reset password (/reset-password)",
    body: "Request a password-reset email if you signed up with email and password and have forgotten your password.",
  },
];

export function HelpPanel({ full = false }: { full?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {full ? (
          <Button variant="ghost" className="justify-start">
            <HelpCircle className="size-4" />
            Help &amp; guide
          </Button>
        ) : (
          <Button variant="outline" size="sm" aria-label="Open help">
            <HelpCircle className="size-4" />
            Help
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto p-6 sm:max-w-lg">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="size-5 text-primary" />
            SEOKH Quick Guide
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 text-sm">
          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <h3 className="font-semibold text-foreground">What SEOKH is</h3>
            <p className="mt-1.5 text-muted-foreground">
              An AI-powered early warning system that predicts whether a student is at risk of
              dropping out. It is decision support — always review results with professional
              judgement.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">How it works</h3>
            <ol className="mt-3 space-y-3">
              {HOW_IT_WORKS.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="size-4" />
                  </span>
                  <div>
                    <span className="font-medium">
                      {i + 1}. {step.title}
                    </span>
                    <p className="text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Navigation pages</h3>
            <p className="mt-1.5 text-muted-foreground">
              Each item in the top menu or route dropdown takes you to a specific part of the app.
            </p>
            <ul className="mt-3 space-y-3">
              {ROUTE_GUIDE.map((route) => (
                <li key={route.title} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <route.icon className="size-4" />
                  </span>
                  <div>
                    <span className="font-medium">{route.title}</span>
                    <p className="text-muted-foreground">{route.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Feature ranges</h3>
            <p className="mt-1.5 text-muted-foreground">
              Values outside these ranges are clamped automatically. Consistent definitions are
              essential for accurate results.
            </p>
            <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FEATURE_KEYS.map((key) => {
                const meta = FEATURE_META[key];
                return (
                  <div
                    key={key}
                    className="rounded-lg border border-border bg-card p-2.5"
                  >
                    <dt className="font-medium text-foreground">{meta.label}</dt>
                    <dd className="text-muted-foreground">
                      {meta.min} – {meta.max} {meta.unit}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <h3 className="font-semibold text-foreground">PDF report templates</h3>
            <p className="mt-1.5 text-muted-foreground">
              You can brand every PDF report and choose one of two layouts. Open the template editor from the top navigation bar to change it.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
              <li>
                <strong>1-page summary</strong> — compact report showing the student, verdict, top 3 risk drivers and 3 recommended interventions. Best for quick handouts or parent meetings.
              </li>
              <li>
                <strong>2-page full report</strong> — detailed report with all drivers, every recommendation, the full model card and disclaimer. Best for referrals, records, and in-depth review.
              </li>
              <li>
                Upload your school logo, set header/footer text, and pick header, accent, risk and safe colours. Saved changes apply to all future PDFs from the Predictor and Bulk Screening pages.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <h3 className="font-semibold text-foreground">Important reminders</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
              <li>The model was trained on a simulated database; validate with real data before use.</li>
              <li>Always review at-risk flags with a human before acting.</li>
              <li>Protect student data and follow local data-protection rules.</li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
