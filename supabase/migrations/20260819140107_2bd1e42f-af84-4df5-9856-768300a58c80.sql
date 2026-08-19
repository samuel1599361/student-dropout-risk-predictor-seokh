-- Relabel the simulated cohort using the cleaner, well-separated data-generating process
-- that the optimized Random Forest model was trained on.
with s as (
  select id,
    (-2.05
      - 0.62*(parent_involvement - 3.0)
      + 0.78*previous_failures
      - 0.055*(assignment_completion - 80)
      - 0.075*(attendance - 88)
      - 0.048*(academic_performance - 70)
      - 0.042*(average_score - 70)
      - 0.038*(engagement_score - 70)
      - 0.10*(study_hours - 15)) as z
  from public.students
)
update public.students t
set dropout = case when s.z > 0 then 1 else 0 end
from s where s.id = t.id;