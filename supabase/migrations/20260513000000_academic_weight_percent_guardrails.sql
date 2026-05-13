-- Academico: pesos como porcentaje por evaluacion.
-- La suma por materia se valida en las acciones; la base protege el rango por fila.

alter table public.grades
  drop constraint if exists grades_weight_percent_range;

do $$
begin
  if exists (
    select 1
    from public.grades
    where weight <= 0 or weight > 100
  ) then
    raise notice 'No se agrega grades_weight_percent_range porque existen pesos fuera de 0.01..100.';
  else
    alter table public.grades
      add constraint grades_weight_percent_range check (weight > 0 and weight <= 100);
  end if;
end $$;
