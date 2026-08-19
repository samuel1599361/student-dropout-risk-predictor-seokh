CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL UNIQUE,
  age integer NOT NULL,
  parent_involvement integer NOT NULL,
  previous_failures integer NOT NULL,
  assignment_completion numeric NOT NULL,
  attendance numeric NOT NULL,
  academic_performance numeric NOT NULL,
  average_score numeric NOT NULL,
  engagement_score numeric NOT NULL,
  study_hours numeric NOT NULL,
  dropout integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated staff can view students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated staff can add students" ON public.students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated staff can update students" ON public.students FOR UPDATE TO authenticated USING (true);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  school text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, school)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'school')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  student_id text NOT NULL,
  probability numeric NOT NULL,
  prediction integer NOT NULL,
  risk_band text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own predictions" ON public.predictions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own predictions" ON public.predictions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own predictions" ON public.predictions FOR DELETE TO authenticated USING (auth.uid() = user_id);

SELECT setseed(0.4242);

INSERT INTO public.students (student_id, age, parent_involvement, previous_failures, assignment_completion, attendance, academic_performance, average_score, engagement_score, study_hours, dropout)
SELECT
  student_id, age, parent_involvement, previous_failures,
  round(assignment_completion::numeric, 2), round(attendance::numeric, 2), round(academic_performance::numeric, 2),
  round(average_score::numeric, 2), round(engagement_score::numeric, 2), round(study_hours::numeric, 2),
  CASE WHEN random() < 1.0 / (1.0 + exp(-(
      -3.2
      - 0.60 * (parent_involvement - 3)
      + 0.95 * previous_failures
      - 0.060 * (assignment_completion - 75)
      - 0.095 * (attendance - 84)
      - 0.030 * (academic_performance - 68)
      - 0.025 * (average_score - 68)
      - 0.045 * (engagement_score - 65)
      - 0.10 * (study_hours - 12)
      + 0.10 * (age - 17)
    ))) THEN 1 ELSE 0 END
FROM (
  SELECT
    'STU' || (1000 + g)::text AS student_id,
    14 + floor(random() * 7)::int AS age,
    1 + floor(random() * 5)::int AS parent_involvement,
    floor(random() * 6)::int AS previous_failures,
    least(100, greatest(0, 75 + 18 * n1)) AS assignment_completion,
    least(100, greatest(40, 84 + 12 * n2)) AS attendance,
    least(100, greatest(0, 68 + 15 * n3)) AS academic_performance,
    least(100, greatest(0, 68 + 15 * n3 + 7 * n4)) AS average_score,
    least(100, greatest(0, 65 + 18 * n5)) AS engagement_score,
    least(35, greatest(0, 12 + 6 * n6)) AS study_hours
  FROM (
    SELECT g,
      sqrt(-2 * ln(random())) * cos(2 * pi() * random()) AS n1,
      sqrt(-2 * ln(random())) * cos(2 * pi() * random()) AS n2,
      sqrt(-2 * ln(random())) * cos(2 * pi() * random()) AS n3,
      sqrt(-2 * ln(random())) * cos(2 * pi() * random()) AS n4,
      sqrt(-2 * ln(random())) * cos(2 * pi() * random()) AS n5,
      sqrt(-2 * ln(random())) * cos(2 * pi() * random()) AS n6
    FROM generate_series(1, 1000) AS g
  ) r
) s;