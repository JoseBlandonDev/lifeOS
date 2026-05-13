-- Académico: nota mínima por asignatura + notas planeadas sin resultado aún.

alter table public.subjects
  add column if not exists passing_grade numeric(4, 2) not null default 3.0;

alter table public.grades
  alter column score drop not null;

-- Sanitiza posibles datos fuera de rango y protege inserts futuros.
update public.subjects
set passing_grade = 3.0
where passing_grade is null or passing_grade < 0 or passing_grade > 5;

alter table public.subjects
  drop constraint if exists subjects_passing_grade_range;
alter table public.subjects
  add constraint subjects_passing_grade_range check (passing_grade >= 0 and passing_grade <= 5);

alter table public.grades
  drop constraint if exists grades_score_range;
alter table public.grades
  add constraint grades_score_range check (score is null or (score >= 0 and score <= 5));
