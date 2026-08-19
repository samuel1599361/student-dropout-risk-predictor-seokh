export type ReportLayout = "compact" | "detailed";

export type ReportTemplate = {
  orgName: string;
  reportTitle: string;
  subtitle: string;
  footerText: string;
  headerColor: string;
  accentColor: string;
  riskColor: string;
  safeColor: string;
  logoDataUrl: string | null;
  showLogo: boolean;
  showFooter: boolean;
  showPageNumbers: boolean;
  layout: ReportLayout;
};

export const DEFAULT_TEMPLATE: ReportTemplate = {
  orgName: "Student Dropout Risk Predictor - SEOK",
  reportTitle: "Early Warning System Report",
  subtitle: "Optimized Random Forest Classifier",
  footerText:
    "Student Dropout Risk Predictor - SEOK  |  Optimized Random Forest Classifier  |  Decision-support only",
  headerColor: "#1e2d44",
  accentColor: "#0f6f86",
  riskColor: "#be1e2d",
  safeColor: "#0d7c66",
  logoDataUrl: null,
  showLogo: true,
  showFooter: true,
  showPageNumbers: true,
  layout: "detailed",
};

const STORAGE_KEY = "seok.report.template.v1";

export function loadTemplate(): ReportTemplate {
  if (typeof window === "undefined") return DEFAULT_TEMPLATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TEMPLATE;
    return { ...DEFAULT_TEMPLATE, ...(JSON.parse(raw) as Partial<ReportTemplate>) };
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

export function saveTemplate(template: ReportTemplate) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(template));
}

export function resetTemplate() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const n = Number.parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return [30, 45, 68];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function tint(hex: string, amount = 0.92): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return [mix(r), mix(g), mix(b)];
}
