import modelJson from "./gb-model.json";

export const FEATURE_KEYS = [
  "ParentInvolvement",
  "PreviousFailures",
  "AssignmentCompletion",
  "Attendance",
  "AcademicPerformance",
  "AverageScore",
  "EngagementScore",
  "StudyHours",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

type Tree = { l: number[]; r: number[]; f: number[]; t: number[]; v: number[] };
type EnsembleModel = {
  kind?: "rf" | "gb";
  model_name?: string;
  features: string[];
  init: number;
  lr: number;
  trees: Tree[];
  importances: Record<string, number>;
  metrics: {
    accuracy: number;
    roc_auc: number;
    precision: number;
    recall: number;
    f1: number;
    confusion: number[][];
    best_params: Record<string, number | string>;
    n_train: number;
    n_test: number;
    positive_rate: number;
  };
};

export const gbModel = modelJson as unknown as EnsembleModel;
export const MODEL_KIND = gbModel.kind ?? "gb";
export const MODEL_NAME = gbModel.model_name ?? "Optimized Random Forest Classifier";
export const MODEL_METRICS = gbModel.metrics;
export const FEATURE_IMPORTANCE = gbModel.importances;


export type FeatureVector = Record<FeatureKey, number>;

export const FEATURE_META: Record<
  FeatureKey,
  {
    label: string;
    unit: string;
    min: number;
    max: number;
    step: number;
    benchmark: number;
    higherIsBetter: boolean;
    help: string;
  }
> = {
  ParentInvolvement: {
    label: "Parent Involvement",
    unit: "/ 5",
    min: 1,
    max: 5,
    step: 1,
    benchmark: 4,
    higherIsBetter: true,
    help: "Guardian engagement rating (1 = absent, 5 = highly involved)",
  },
  PreviousFailures: {
    label: "Previous Failures",
    unit: "subjects",
    min: 0,
    max: 5,
    step: 1,
    benchmark: 0,
    higherIsBetter: false,
    help: "Number of previously failed courses or repeated terms",
  },
  AssignmentCompletion: {
    label: "Assignment Completion",
    unit: "%",
    min: 0,
    max: 100,
    step: 0.5,
    benchmark: 85,
    higherIsBetter: true,
    help: "Share of assignments submitted this session",
  },
  Attendance: {
    label: "Attendance",
    unit: "%",
    min: 40,
    max: 100,
    step: 0.5,
    benchmark: 92,
    higherIsBetter: true,
    help: "Percentage of school days attended",
  },
  AcademicPerformance: {
    label: "Academic Performance",
    unit: "/ 100",
    min: 0,
    max: 100,
    step: 0.5,
    benchmark: 75,
    higherIsBetter: true,
    help: "Composite teacher-assessed performance index",
  },
  AverageScore: {
    label: "Average Score",
    unit: "/ 100",
    min: 0,
    max: 100,
    step: 0.5,
    benchmark: 75,
    higherIsBetter: true,
    help: "Mean score across all assessed subjects",
  },
  EngagementScore: {
    label: "Engagement Score",
    unit: "/ 100",
    min: 0,
    max: 100,
    step: 0.5,
    benchmark: 75,
    higherIsBetter: true,
    help: "Participation in class, clubs and learning platforms",
  },
  StudyHours: {
    label: "Study Hours",
    unit: "hrs / week",
    min: 0,
    max: 35,
    step: 0.5,
    benchmark: 16,
    higherIsBetter: true,
    help: "Self-reported independent study hours per week",
  },
};

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

function rawScore(row: number[]): number {
  let raw = gbModel.init;
  for (const tree of gbModel.trees) {
    let node = 0;
    while (tree.l[node]! !== -1) {
      node = row[tree.f[node]!]! <= tree.t[node]! ? tree.l[node]! : tree.r[node]!;
    }
    raw += gbModel.lr * tree.v[node]!;
  }
  return raw;
}

export function toRow(features: FeatureVector): number[] {
  return FEATURE_KEYS.map((key) => Number(features[key]));
}

export function probability(features: FeatureVector): number {
  const raw = rawScore(toRow(features));
  // Random forest leaves already hold class probabilities (averaged via lr = 1/n_trees).
  return MODEL_KIND === "rf" ? Math.min(1, Math.max(0, raw)) : sigmoid(raw);
}

export type RiskBand = "Low" | "Moderate" | "Elevated" | "High";

export function riskBand(p: number): RiskBand {
  if (p < 0.25) return "Low";
  if (p < 0.5) return "Moderate";
  if (p < 0.75) return "Elevated";
  return "High";
}

export type Driver = {
  key: FeatureKey;
  label: string;
  value: number;
  unit: string;
  benchmark: number;
  impact: number; // percentage points of risk attributable to this feature
  direction: "increases" | "reduces";
  reason: string;
};

const REASONS: Record<FeatureKey, { bad: string; good: string }> = {
  ParentInvolvement: {
    bad: "Low guardian involvement removes the home-side accountability that keeps students enrolled.",
    good: "Strong guardian involvement provides consistent home support and accountability.",
  },
  PreviousFailures: {
    bad: "Repeated academic failure is the strongest historical predictor of disengagement and withdrawal.",
    good: "A clean academic record with no prior failures signals stable progression.",
  },
  AssignmentCompletion: {
    bad: "Unsubmitted coursework compounds into grade loss and is an early behavioural signal of withdrawal.",
    good: "Consistent assignment submission indicates sustained academic routine.",
  },
  Attendance: {
    bad: "Irregular attendance breaks instructional continuity and typically precedes formal dropout.",
    good: "Regular attendance keeps the student inside the instructional and social fabric of the school.",
  },
  AcademicPerformance: {
    bad: "Weak overall performance lowers self-efficacy and increases the perceived cost of staying enrolled.",
    good: "Solid academic standing reinforces confidence and progression.",
  },
  AverageScore: {
    bad: "Below-benchmark average scores narrow promotion and certification prospects.",
    good: "Healthy average scores keep promotion and certification pathways open.",
  },
  EngagementScore: {
    bad: "Low engagement in class and school activities reflects weakening attachment to school life.",
    good: "High engagement reflects a strong sense of belonging at school.",
  },
  StudyHours: {
    bad: "Insufficient independent study time limits mastery and widens the gap after any absence.",
    good: "Adequate independent study time supports mastery and recovery after absences.",
  },
};

/**
 * Counterfactual attribution: how much of the predicted risk each feature owns,
 * measured by re-scoring the student with that single feature moved to the
 * cohort benchmark (all else held constant).
 */
export function explain(features: FeatureVector): Driver[] {
  const base = probability(features);
  return FEATURE_KEYS.map((key) => {
    const meta = FEATURE_META[key];
    const counterfactual = probability({ ...features, [key]: meta.benchmark });
    const impact = (base - counterfactual) * 100;
    const value = Number(features[key]);
    const worseThanBenchmark = meta.higherIsBetter
      ? value < meta.benchmark
      : value > meta.benchmark;
    return {
      key,
      label: meta.label,
      value,
      unit: meta.unit,
      benchmark: meta.benchmark,
      impact,
      direction: impact >= 0 ? "increases" : "reduces",
      reason: worseThanBenchmark ? REASONS[key].bad : REASONS[key].good,
    } as Driver;
  }).sort((a, b) => b.impact - a.impact);
}

const RECOMMENDATIONS: Record<FeatureKey, string[]> = {
  ParentInvolvement: [
    "Schedule a guardian conference within 10 days and agree a written home-support plan.",
    "Enrol the guardian in weekly SMS/WhatsApp progress alerts from the form teacher.",
  ],
  PreviousFailures: [
    "Assign a subject-specific remedial tutor for every previously failed course.",
    "Create a credit-recovery timetable with fortnightly mastery checkpoints.",
  ],
  AssignmentCompletion: [
    "Institute a daily homework check-in with a named staff mentor.",
    "Break outstanding coursework into small, dated deliverables with supervised catch-up sessions.",
  ],
  Attendance: [
    "Trigger same-day absence calls home and log reasons for every missed day.",
    "Investigate structural barriers (transport, fees, health, caregiving) and refer to welfare support.",
  ],
  AcademicPerformance: [
    "Place the student in a small-group intervention class for the two weakest subjects.",
    "Run a diagnostic assessment to isolate specific skill gaps before re-teaching.",
  ],
  AverageScore: [
    "Set a realistic score-improvement target per subject and review it every three weeks.",
    "Offer alternative assessment formats to confirm understanding masked by low test scores.",
  ],
  EngagementScore: [
    "Match the student to one club, sport or peer-learning group aligned to their interests.",
    "Give a visible classroom responsibility to rebuild school attachment.",
  ],
  StudyHours: [
    "Provide a supervised after-school study slot of at least 4 hours per week.",
    "Co-design a realistic weekly study timetable with the student and guardian.",
  ],
};

export function recommendations(features: FeatureVector, drivers: Driver[]): string[] {
  const priority = drivers.filter((d) => d.impact > 0.5).slice(0, 4);
  const out: string[] = [];
  for (const d of priority) out.push(...RECOMMENDATIONS[d.key]);
  const p = probability(features);
  if (p >= 0.5) {
    out.unshift(
      "Open a formal Early Warning case file and assign a single accountable case manager.",
    );
    out.push("Review the case at the next student-support meeting and re-run the prediction in 30 days.");
  } else {
    out.push("Continue routine monitoring and re-run the prediction at the end of the term.");
  }
  return Array.from(new Set(out));
}

export type PredictionResult = {
  probability: number;
  label: 0 | 1;
  band: RiskBand;
  drivers: Driver[];
  recommendations: string[];
};

export function predict(features: FeatureVector): PredictionResult {
  const p = probability(features);
  const drivers = explain(features);
  return {
    probability: p,
    label: p >= 0.5 ? 1 : 0,
    band: riskBand(p),
    drivers,
    recommendations: recommendations(features, drivers),
  };
}
