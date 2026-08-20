# SEOKH User Guide — School Administrators & Staff

## What SEOKH is
- An AI-powered **early warning system** for student dropout risk.
- It classifies each student as **At Risk of Dropout (1)** or **Not At Risk of Dropout (0)**.
- It returns a probability, a risk band, the main risk drivers, and recommended interventions.
- It is **decision support**, not a replacement for professional judgment.

## Getting started
1. Sign up with your school email or use **Continue with Google**.
2. If you used Google, sign in with the **Google** button — not the email/password form.
3. Sign out anytime from the top-right menu.

## Making a single prediction
1. Open **Predict** from the navigation.
2. Enter a **Student ID** (e.g., `STU1042`) from the cohort, or enter the eight features manually.
3. Click **Predict**.
4. Review the verdict, probability, risk band, risk drivers, and recommendations.
5. Click **Download PDF** to save a case report.

## Reading the result
- **Red X** — the student is predicted as **At Risk**.
- **Teal checkmark** — the student is predicted as **Not At Risk**.
- **Risk bands**
  - Low: < 25 %
  - Moderate: 25 – 50 %
  - Elevated: 50 – 75 %
  - High: ≥ 75 %
- **Drivers** explain which factors contribute most to the risk score.
- **Recommendations** are prioritized by impact.

## The eight predictive features and their valid ranges
| Feature | Range | Unit |
| --- | --- | --- |
| Parent Involvement | 1 – 5 | / 5 |
| Previous Failures | 0 – 5 | subjects |
| Assignment Completion | 0 – 100 | % |
| Attendance | 40 – 100 | % |
| Academic Performance | 0 – 100 | / 100 |
| Average Score | 0 – 100 | / 100 |
| Engagement Score | 0 – 100 | / 100 |
| Study Hours | 0 – 35 | hours / week |

Values entered outside these ranges are automatically clamped to the nearest boundary. Accurate results depend on consistent definitions and correct data entry across the school.

## Bulk screening with a CSV
1. Go to **Bulk CSV**.
2. Download the CSV template and fill it with student records.
3. Upload the file.
4. Filter the results table (for example, show only at-risk students).
5. Export the results table or batch-download PDF reports for at-risk students.

## Managing student records
1. Go to **Students**.
2. Search existing records, or click **Add student**.
3. Fill in Student ID, Age, and the eight features.
4. The form validates every field and warns if a Student ID already exists.
5. The live preview badge shows the predicted risk as you type.

## Branding your PDF reports
1. Go to **Template**.
2. Upload your school logo, set header/footer text, and choose a colour band.
3. Select **Compact (1 page)** or **Detailed (2 page)** layout.
4. The preview updates immediately; PDFs use these settings from then on.

## Important reminders
- The model was trained on a **simulated 1,000-student cohort**. Metrics show the pipeline works, not real-world accuracy.
- Before operational use, retrain and validate the model on your own institutional data.
- Every at-risk flag should be reviewed by a qualified staff member before any action is taken.
- Record the eight features consistently across all staff and systems.
- Student records are personal data: restrict staff access, keep reports secure, and follow your local data-protection rules.
- **Evaluation mode (known limitation):** any account that signs up can immediately read and manage all records in the demo database. This is intentional so assessors can sign up and test everything at once, and is acceptable only because the 1,000 records are simulated. A real deployment needs a staff-role table with role-scoped access rules and an approval step for new accounts.


---

For technical details, model selection rationale, and overfitting assessment, see the project `README.md`.
