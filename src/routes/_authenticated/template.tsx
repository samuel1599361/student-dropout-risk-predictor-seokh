import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { predict } from "@/lib/model";
import { buildReport, type StudentRecord } from "@/lib/report";
import {
  DEFAULT_TEMPLATE,
  loadTemplate,
  resetTemplate,
  saveTemplate,
  type ReportLayout,
  type ReportTemplate,
} from "@/lib/report-template";

export const Route = createFileRoute("/_authenticated/template")({
  component: TemplateEditor,
  head: () => ({
    meta: [
      { title: "PDF Report Template Editor | SEOKH Early Warning System" },
      {
        name: "description",
        content:
          "Customise dropout risk report branding: logo, colors, header and footer text, and choose a 1-page or 2-page PDF layout.",
      },
      { property: "og:title", content: "PDF Report Template Editor | SEOKH" },
      {
        property: "og:description",
        content:
          "Adjust logo, colors, header and footer, and switch between compact 1-page and detailed 2-page dropout risk reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const SAMPLE: StudentRecord = {
  student_id: "STU1003",
  age: 17,
  ParentInvolvement: 1.6,
  PreviousFailures: 3,
  AssignmentCompletion: 42,
  Attendance: 61,
  AcademicPerformance: 48,
  AverageScore: 45,
  EngagementScore: 2.1,
  StudyHours: 3.5,
};

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 cursor-pointer rounded-md border border-border bg-card p-1"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
      </div>
    </div>
  );
}

function TemplateEditor() {
  const { user } = useAuth();
  const [template, setTemplate] = useState<ReportTemplate>(DEFAULT_TEMPLATE);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTemplate(loadTemplate());
  }, []);

  const set = <K extends keyof ReportTemplate>(key: K, value: ReportTemplate[K]) =>
    setTemplate((prev) => ({ ...prev, [key]: value }));

  const sampleResult = useMemo(() => predict(SAMPLE), []);

  const openPdfPreview = () => {
    try {
      const doc = buildReport(SAMPLE, sampleResult, user?.email ?? "School staff", template);
      const url = URL.createObjectURL(doc.output("blob"));
      const a = document.createElement("a");
      a.href = url;
      a.download = `SEOKH-template-preview-${SAMPLE.student_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success("Sample PDF generated with your current settings");
    } catch {
      toast.error("Could not build the sample PDF");
    }
  };


  const onLogo = (file: File) => {
    if (file.size > 1_000_000) {
      toast.error("Logo must be smaller than 1 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logoDataUrl", String(reader.result));
    reader.readAsDataURL(file);
  };

  const layouts: Array<{ value: ReportLayout; title: string; desc: string }> = [
    {
      value: "compact",
      title: "1-page summary",
      desc: "Verdict, features, top 3 drivers and 3 interventions — fits on a single page.",
    },
    {
      value: "detailed",
      title: "2-page full report",
      desc: "All drivers, every intervention, full model card and disclaimer.",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold">PDF report template</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Brand every risk report generated from the predictor and bulk screening pages. Changes are
          saved to this browser and applied to all future downloads.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Layout</CardTitle>
              <CardDescription>Choose the report length.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {layouts.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => set("layout", l.value)}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    template.layout === l.value
                      ? "border-primary bg-accent/40"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="flex items-center gap-2 font-display text-sm font-semibold">
                    <FileText className="size-4 text-primary" />
                    {l.title}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{l.desc}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Branding</CardTitle>
              <CardDescription>Logo and organisation identity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-xs">Show logo in header</Label>
                  <p className="text-[11px] text-muted-foreground">PNG or JPG, up to 1 MB.</p>
                </div>
                <Switch
                  checked={template.showLogo}
                  onCheckedChange={(v) => set("showLogo", v)}
                  aria-label="Show logo"
                />
              </div>

              <div className="flex items-center gap-3">
                {template.logoDataUrl ? (
                  <img
                    src={template.logoDataUrl}
                    alt="Report logo preview"
                    className="size-14 rounded-lg border border-border bg-card object-contain p-1"
                  />
                ) : (
                  <span className="flex size-14 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
                    No logo
                  </span>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload className="size-4" />
                    Upload logo
                  </Button>
                  {template.logoDataUrl && (
                    <Button variant="ghost" size="sm" onClick={() => set("logoDataUrl", null)}>
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onLogo(file);
                    e.target.value = "";
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="orgName">
                  Organisation / header title
                </Label>
                <Input
                  id="orgName"
                  value={template.orgName}
                  onChange={(e) => set("orgName", e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor="reportTitle">
                    Report title
                  </Label>
                  <Input
                    id="reportTitle"
                    value={template.reportTitle}
                    onChange={(e) => set("reportTitle", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor="subtitle">
                    Subtitle
                  </Label>
                  <Input
                    id="subtitle"
                    value={template.subtitle}
                    onChange={(e) => set("subtitle", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Colors</CardTitle>
              <CardDescription>Header band, accent rule and verdict colors.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <ColorField
                label="Header band"
                value={template.headerColor}
                onChange={(v) => set("headerColor", v)}
              />
              <ColorField
                label="Accent"
                value={template.accentColor}
                onChange={(v) => set("accentColor", v)}
              />
              <ColorField
                label="At risk"
                value={template.riskColor}
                onChange={(v) => set("riskColor", v)}
              />
              <ColorField
                label="Not at risk"
                value={template.safeColor}
                onChange={(v) => set("safeColor", v)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Footer</CardTitle>
              <CardDescription>Shown at the bottom of every page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label className="text-xs">Show footer text</Label>
                <Switch
                  checked={template.showFooter}
                  onCheckedChange={(v) => set("showFooter", v)}
                  aria-label="Show footer"
                />
              </div>
              <Textarea
                value={template.footerText}
                onChange={(e) => set("footerText", e.target.value)}
                rows={3}
                disabled={!template.showFooter}
              />
              <div className="flex items-center justify-between gap-4">
                <Label className="text-xs">Show page numbers</Label>
                <Switch
                  checked={template.showPageNumbers}
                  onCheckedChange={(v) => set("showPageNumbers", v)}
                  aria-label="Show page numbers"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                saveTemplate(template);
                toast.success("Template saved — new reports will use this branding");
              }}
            >
              <Save className="size-4" />
              Save template
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                resetTemplate();
                setTemplate(DEFAULT_TEMPLATE);
                toast.success("Reset to the default SEOKH template");
              }}
            >
              <RotateCcw className="size-4" />
              Reset to default
            </Button>
          </div>
        </div>

        <Card className="lg:sticky lg:top-24 lg:self-start">
          <CardHeader>
            <CardTitle className="text-base">Live preview</CardTitle>
            <CardDescription>
              Sample report for {SAMPLE.student_id} using your current settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ backgroundColor: template.headerColor }}
              >
                {template.showLogo && template.logoDataUrl && (
                  <img
                    src={template.logoDataUrl}
                    alt="Report logo"
                    className="size-9 rounded bg-white/90 object-contain p-0.5"
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-white">{template.orgName}</p>
                  <p className="truncate text-[11px] text-white/75">
                    {template.reportTitle} — {template.subtitle}
                  </p>
                </div>
              </div>
              <div style={{ backgroundColor: template.accentColor, height: 3 }} />

              <div className="space-y-4 p-4 text-[#1b2431]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[#6b7280]">Student</p>
                    <p className="text-sm font-semibold">
                      {SAMPLE.student_id} · Age {SAMPLE.age}
                    </p>
                  </div>
                  <span
                    className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white"
                    style={{
                      backgroundColor:
                        sampleResult.label === 1 ? template.riskColor : template.safeColor,
                    }}
                  >
                    {sampleResult.label === 1
                      ? "✗ At Risk of Dropout (1)"
                      : "Not At Risk of Dropout (0)"}
                    {" · "}
                    {(sampleResult.probability * 100).toFixed(1)}% ({sampleResult.band})
                  </span>
                </div>

                <div>
                  <p
                    className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: template.accentColor }}
                  >
                    Input features
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    {sampleResult.drivers.map((d) => (
                      <div key={d.key} className="flex justify-between border-b border-dashed border-[#e5e7eb] py-0.5">
                        <span className="truncate text-[#4b5563]">{d.label}</span>
                        <span className="font-medium">
                          {d.value} {d.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p
                    className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: template.accentColor }}
                  >
                    Why this verdict
                  </p>
                  <ul className="space-y-1 text-[11px] text-[#374151]">
                    {sampleResult.drivers
                      .slice(0, template.layout === "compact" ? 3 : 5)
                      .map((d) => (
                        <li key={d.key}>
                          <span className="font-medium">
                            {d.label} ({d.direction === "increases" ? "+" : "−"}
                            {Math.abs(d.impact).toFixed(1)} pp)
                          </span>{" "}
                          — {d.reason}
                        </li>
                      ))}
                  </ul>
                </div>

                <div>
                  <p
                    className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: template.accentColor }}
                  >
                    Recommended actions
                  </p>
                  <ol className="list-inside list-decimal space-y-1 text-[11px] text-[#374151]">
                    {sampleResult.recommendations
                      .slice(0, template.layout === "compact" ? 3 : 6)
                      .map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                  </ol>
                </div>

                {template.layout === "detailed" && (
                  <div className="rounded-md bg-[#f3f4f6] p-3 text-[10px] leading-relaxed text-[#4b5563]">
                    <span className="font-semibold">Page 2 — Model card:</span> Optimized Random
                    Forest classifier, 8 predictive features, 1,000-record simulated database,
                    out-of-bag validation, decision-support only.
                  </div>
                )}
              </div>

              {template.showFooter && (
                <div className="flex items-center justify-between gap-3 border-t border-[#e5e7eb] px-4 py-2 text-[9px] text-[#6b7280]">
                  <span className="truncate">{template.footerText}</span>
                  {template.showPageNumbers && (
                    <span className="shrink-0">Page 1 of {template.layout === "detailed" ? 2 : 1}</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={openPdfPreview}>
                <FileText className="size-4" />
                Download sample PDF
              </Button>
              <p className="text-xs text-muted-foreground">
                {template.layout === "detailed" ? "2-page full report" : "1-page summary"}
              </p>
            </div>
          </CardContent>

        </Card>
      </div>
    </div>
  );
}
