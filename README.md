# Student Dropout Risk Predictor — SEOKH

> GitHub repository: `student-dropout-risk-predictor-seokh`

**SEOKH Early Warning System** is an AI-powered web application that helps school
administrators identify students at risk of dropping out, understand *why* they
are at risk, and act on concrete, prioritised interventions.

It is a **binary classification** system: for each student it predicts
**At Risk of Dropout (1)** or **Not At Risk of Dropout (0)**, using
`Student ID` as the identifier and `Dropout` as the target variable.

---

## 1. Feature overview

| Area | What it does |
| --- | --- |
| **Landing page** (`/`) | Product overview, model metrics, the eight predictive features with their acceptable ranges and cohort benchmarks. |
| **Authentication** (`/auth`) | Staff sign-up / sign-in with email + password or Google. Inline validation, human-readable errors, show/hide password, forgot-password flow (`/reset-password`). |
| **Single prediction** (`/predict`) | Look up a student by ID from the 1,000-record cohort (or enter the features manually), get a risk probability, a binary verdict (red **X** for at-risk, teal check for not-at-risk), risk-driver explanations, and recommended interventions. |
| **Bulk screening** (`/bulk`) | Upload a CSV of a whole cohort, get a filterable results table, export results as CSV, and batch-download PDF reports for at-risk students. Includes a downloadable CSV template. |
| **Student management** (`/students`) | Search, add and edit student records with full field validation, duplicate-ID protection, and a live model-preview badge that updates as you type. |
| **Insights** (`/insights`) | Cohort statistics, feature-importance chart, model card, model-selection rationale, and your recent prediction history. |
| **PDF template editor** (`/template`) | Brand the report: logo, header/footer text, colour band, and a choice of 1-page (compact) or 2-page (detailed) layout, with a live preview. |

Every prediction can be downloaded as a **PDF report**.

---

## 2. The eight predictive features

Features are supplied to the model in this exact order.

| # | Feature | Acceptable range | Unit | Benchmark |
| --- | --- | --- | --- | --- |
| 1 | Parent Involvement | 1 – 5 | / 5 | 4 |
| 2 | Previous Failures | 0 – 5 | subjects | 0 |
| 3 | Assignment Completion | 0 – 100 | % | 85 |
| 4 | Attendance | 40 – 100 | % | 92 |
| 5 | Academic Performance | 0 – 100 | / 100 | 75 |
| 6 | Average Score | 0 – 100 | / 100 | 75 |
| 7 | Engagement Score | 0 – 100 | / 100 | 75 |
| 8 | Study Hours | 0 – 35 | hrs / week | 16 |

Values outside a range are clamped to the nearest valid boundary before scoring.
`Student ID` and `Age` are captured alongside the features but are **not** model
inputs.

Risk bands: **Low** (< 25%), **Moderate** (25–50%), **Elevated** (50–75%),
**High** (≥ 75%). The binary verdict flips to *At Risk* at a probability of 0.50.

---

## 3. Machine learning model

### Selected model
**Optimized Random Forest classifier**, hyperparameter-tuned with `GridSearchCV`
(5-fold, ROC-AUC scoring):

```
n_estimators=250, max_depth=10, min_samples_leaf=2,
max_features=0.6, class_weight=balanced_subsample
```

### Held-out performance (20% stratified test split)

| Metric | Value |
| --- | --- |
| Accuracy | 0.995 |
| Precision | 1.000 |
| Recall | 0.983 |
| F1 | 0.992 |
| ROC-AUC | 0.9995 |
| 5-fold CV AUC | 0.9997 |
| OOB score | 0.995 |

### Models trained, tuned and compared (10)

Logistic Regression · Gaussian Naive Bayes · k-Nearest Neighbours ·
Support Vector Machine (RBF) · Decision Tree · AdaBoost · Extra Trees ·
Gradient Boosting · Neural Network (MLP) · **Random Forest (selected)**

On the current low-noise simulated cohort several models saturate at ~1.000, so
Random Forest is **not uniquely the highest-scoring model**. It matched the top
tier and was selected on non-accuracy grounds: robustness under label-noise
stress tests, built-in OOB validation, native impurity-based feature importance
(used by the Insights page and the PDF), no need for feature scaling, and a tree
structure that serialises cleanly to JSON for in-browser inference. Decision
Tree was the only clearly weaker candidate.

### Overfitting assessment
Diagnostics run on the same pipeline and cohort: generalisation gap of 0.5 pp
(train AUC 1.0000 vs test 0.9995), 5-fold CV AUC 0.9998 ± 0.0002, and a
100-shuffle permutation test that collapses to AUC 0.500 (p = 0.010), confirming
the model learns real relationships rather than memorising records. **Verdict: no
material overfitting.** The near-perfect scores reflect the low-noise *simulated*
cohort, not real school data.

### Explainability
Risk drivers use **counterfactual attribution**: each feature is re-scored at the
cohort benchmark with all other features held constant, and the resulting change
in predicted probability is that feature's contribution (in percentage points).
Drivers are ranked, paired with plain-language reasoning, and mapped to concrete
intervention recommendations.

### Inference
The trained forest is exported to `src/lib/gb-model.json` and evaluated entirely
**in the browser** by `src/lib/model.ts` (tree traversal, mean of leaf
probabilities). No inference server, no per-prediction latency or cost.

---

## 4. Data

1,000 simulated student records seeded into the database, with IDs `STU1001` –
`STU2000`. Each record carries the student ID, age, the eight features and the
`Dropout` label. The generating process is well separated so labels are
consistent with the features — this is why measured metrics are near-perfect and
should not be read as real-world accuracy.

### Database tables

| Table | Purpose |
| --- | --- |
| `students` | Student ID, age, the eight features, `dropout` label. |
| `profiles` | Staff profile created automatically on sign-up. |
| `predictions` | Per-user prediction history (probability, label, risk band). |

Row-Level Security is enabled on all tables: student data is readable by
authenticated staff, and prediction history is scoped to its owning user.

---

## 5. Tech stack

- **TanStack Start v1** (React 19, file-based routing, SSR) + **Vite 7**
- **TypeScript**
- **Tailwind CSS v4** with semantic OKLCH design tokens (ink-navy + teal theme)
- **shadcn/ui** + Radix primitives, **sonner** for toasts
- **Lovable Cloud** for auth, Postgres database and RLS
- **jsPDF** for client-side PDF report generation
- **scikit-learn** (offline) for training, tuning and JSON export of the model

### Key files

```
src/lib/model.ts             feature metadata, inference, explanation, recommendations
src/lib/gb-model.json        exported Random Forest (trees + importances + metrics)
src/lib/report.ts            PDF report generation (compact + detailed layouts)
src/lib/report-template.ts   branding/layout template schema and persistence
src/lib/bulk.ts              CSV parsing, aliasing, results export, template
src/hooks/useAuth.ts         auth session state
src/components/AppHeader.tsx responsive navigation (slide-out menu on mobile)
src/routes/                  file-based routes; _authenticated/ is the guarded subtree
```

---

## 6. Running locally

```sh
git clone https://github.com/samuel1599361/student-dropout-risk-predictor-seokh.git
cd student-dropout-risk-predictor-seokh
npm i
npm run dev
```

The app serves on `http://localhost:8080`. Backend environment variables are
provisioned automatically by Lovable Cloud.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

---

## 7. Typical workflow

1. Sign up with a school email (or Google) and sign in.
2. Optionally brand the report under **Template**.
3. **Predict** — enter a Student ID (e.g. `STU1042`), click *Predict*, review the
   verdict, drivers and recommendations, then download the PDF.
4. **Bulk CSV** — download the template, fill in a cohort, upload it, filter for
   at-risk students, export the results table, and batch-download reports.
5. **Students** — add or correct records as new data arrives.
6. **Insights** — monitor cohort risk distribution, factor importance and your
   prediction history.

---

## 8. Limitations and responsible use

- The cohort is **synthetic**. Metrics demonstrate the pipeline, not real-world
  predictive accuracy; retrain on institutional data before operational use.
- Predictions are decision **support**, not decisions. Every at-risk flag should
  be reviewed by a human before any action affecting a student.
- Feature definitions must be recorded consistently across the school, otherwise
  the drivers and recommendations will be misleading.
- Student records are personal data — restrict staff accounts accordingly and
  retain reports in line with local data-protection rules.

### Known limitation: open staff access (evaluation mode)

This is an academic capstone project built for assessor evaluation. To make
evaluation frictionless, **any account that signs up is treated as school
staff**: once signed in, a user can read and manage all records in the
simulated `students` table. There is no role table, approval step, or
school-scoped partitioning.

This is a deliberate, documented trade-off, and it is safe here only because
all 1,000 student records are **synthetic** — no real student data exists in
the database. Before any operational deployment the following must be added:

- a separate `user_roles` table with an `app_role` enum (never roles on
  `profiles`), plus a `security definer` `has_role()` function;
- RLS policies on `students` scoped to `has_role(auth.uid(), 'staff')` instead
  of any authenticated user;
- an administrator-controlled approval flow for new staff sign-ups (email
  domain allow-list and/or manual role grant);
- removal of email auto-confirmation so accounts must verify their address.

Prediction history in `predictions` is already scoped to its owning user, and
`profiles` rows are per-user.


---

Built with [Lovable](https://lovable.dev).
