-- Vincula abonos automáticos del presupuesto al ingreso que los generó (si borras el ingreso, se revierten).
alter table public.budget_allocations
  add column if not exists source_transaction_id uuid references public.transactions (id) on delete cascade;

create index if not exists budget_allocations_source_transaction_id_idx
  on public.budget_allocations (source_transaction_id)
  where source_transaction_id is not null;
