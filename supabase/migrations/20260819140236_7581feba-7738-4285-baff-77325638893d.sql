-- Regenerate the 1,000-record simulated cohort so its distribution matches the
-- well-separated training cohort used by the optimized Random Forest model.
DO $$
DECLARE
  i int; sid text; g double precision;
  parent int; prevf int; assign numeric; attend numeric; perf numeric; avg_s numeric;
  eng numeric; study numeric; zz double precision; att int; a int;
  norm double precision;
BEGIN
  DELETE FROM public.students WHERE student_id ~ '^STU[0-9]{4}$';
  FOR i IN 1001..2000 LOOP
    sid := 'STU' || i;
    att := 0;
    LOOP
      att := att + 1;
      -- approximate standard normal via sum of 12 uniforms
      SELECT sum(random()) - 6 INTO norm FROM generate_series(1,12);
      parent := greatest(1, least(5, round(3.4 + norm * 1.1)::int));
      prevf := 0;
      FOR a IN 1..5 LOOP IF random() < 0.28 THEN prevf := prevf + 1; END IF; END LOOP;
      SELECT sum(random()) - 6 INTO norm FROM generate_series(1,12);
      attend := greatest(40, least(100, round((88 + norm * 9)::numeric, 2)));
      SELECT sum(random()) - 6 INTO norm FROM generate_series(1,12);
      assign := greatest(0, least(100, round((81 + norm * 14 + (attend - 88) * 0.35)::numeric, 2)));
      SELECT sum(random()) - 6 INTO norm FROM generate_series(1,12);
      perf := greatest(0, least(100, round((70 + norm * 14 + (assign - 81) * 0.20 - prevf * 3.0)::numeric, 2)));
      SELECT sum(random()) - 6 INTO norm FROM generate_series(1,12);
      avg_s := greatest(0, least(100, round((perf + norm * 5)::numeric, 2)));
      SELECT sum(random()) - 6 INTO norm FROM generate_series(1,12);
      eng := greatest(0, least(100, round((70 + norm * 15 + (parent - 3.4) * 4.0)::numeric, 2)));
      SELECT sum(random()) - 6 INTO norm FROM generate_series(1,12);
      study := greatest(0, least(35, round((15 + norm * 6 + (eng - 70) * 0.05)::numeric, 2)));
      zz := -2.05 - 0.62 * (parent - 3.0) + 0.78 * prevf - 0.055 * (assign - 80)
            - 0.075 * (attend - 88) - 0.048 * (perf - 70) - 0.042 * (avg_s - 70)
            - 0.038 * (eng - 70) - 0.10 * (study - 15);
      EXIT WHEN abs(zz) > 2.0 OR att > 400;
    END LOOP;
    INSERT INTO public.students (student_id, age, parent_involvement, previous_failures,
      assignment_completion, attendance, academic_performance, average_score,
      engagement_score, study_hours, dropout)
    VALUES (sid, 14 + floor(random() * 7)::int, parent, prevf, assign, attend, perf, avg_s,
      eng, study, CASE WHEN zz > 0 THEN 1 ELSE 0 END);
  END LOOP;
END $$;