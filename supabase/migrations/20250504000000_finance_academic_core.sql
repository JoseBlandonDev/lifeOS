-- Finanzas, académico, notas y base para productividad
-- Ejecutar en Supabase SQL Editor o con: supabase db push

-- ── Finanzas ─────────────────────────────────────────────────────────────
create table if not exists public.pockets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  target_amount numeric(14, 2),
  color text default '#6366f1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pocket_id uuid references public.pockets (id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'EUR',
  category text,
  note text,
  occurred_on date not null default (now() at time zone 'utc'),
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_occurred_idx
  on public.transactions (user_id, occurred_on desc);
create index if not exists pockets_user_idx on public.pockets (user_id);

-- ── Académico ────────────────────────────────────────────────────────────
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  code text,
  color text default '#8b5cf6',
  credits numeric(5, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  title text not null,
  score numeric(6, 2) not null,
  weight numeric(8, 3) not null default 1 check (weight > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.subject_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null,
  done boolean not null default false,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists grades_user_subject_idx on public.grades (user_id, subject_id);
create index if not exists subject_tasks_user_idx on public.subject_tasks (user_id, done);

-- ── Notas rápidas ─────────────────────────────────────────────────────────
create table if not exists public.quick_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Sin título',
  body text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists quick_notes_user_updated_idx
  on public.quick_notes (user_id, updated_at desc);

-- ── Sesiones Pomodoro (opcional persistencia) ─────────────────────────────
create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  duration_seconds int not null check (duration_seconds > 0),
  started_at timestamptz not null default now(),
  completed boolean not null default true
);

create index if not exists pomodoro_sessions_user_idx
  on public.pomodoro_sessions (user_id, started_at desc);

-- Eventos de calendario en caché (opcional; OAuth va por Auth.js)
create table if not exists public.calendar_cache_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  external_id text not null,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  raw jsonb,
  synced_at timestamptz not null default now(),
  unique (user_id, provider, external_id)
);

create index if not exists calendar_cache_user_starts_idx
  on public.calendar_cache_events (user_id, starts_at);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.pockets enable row level security;
alter table public.transactions enable row level security;
alter table public.subjects enable row level security;
alter table public.grades enable row level security;
alter table public.subject_tasks enable row level security;
alter table public.quick_notes enable row level security;
alter table public.pomodoro_sessions enable row level security;
alter table public.calendar_cache_events enable row level security;

-- pockets
create policy "pockets_select_own" on public.pockets
  for select to authenticated using (auth.uid() = user_id);
create policy "pockets_insert_own" on public.pockets
  for insert to authenticated with check (auth.uid() = user_id);
create policy "pockets_update_own" on public.pockets
  for update to authenticated using (auth.uid() = user_id);
create policy "pockets_delete_own" on public.pockets
  for delete to authenticated using (auth.uid() = user_id);

-- transactions
create policy "transactions_select_own" on public.transactions
  for select to authenticated using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update to authenticated using (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete to authenticated using (auth.uid() = user_id);

-- subjects
create policy "subjects_select_own" on public.subjects
  for select to authenticated using (auth.uid() = user_id);
create policy "subjects_insert_own" on public.subjects
  for insert to authenticated with check (auth.uid() = user_id);
create policy "subjects_update_own" on public.subjects
  for update to authenticated using (auth.uid() = user_id);
create policy "subjects_delete_own" on public.subjects
  for delete to authenticated using (auth.uid() = user_id);

-- grades
create policy "grades_select_own" on public.grades
  for select to authenticated using (auth.uid() = user_id);
create policy "grades_insert_own" on public.grades
  for insert to authenticated with check (auth.uid() = user_id);
create policy "grades_update_own" on public.grades
  for update to authenticated using (auth.uid() = user_id);
create policy "grades_delete_own" on public.grades
  for delete to authenticated using (auth.uid() = user_id);

-- subject_tasks
create policy "subject_tasks_select_own" on public.subject_tasks
  for select to authenticated using (auth.uid() = user_id);
create policy "subject_tasks_insert_own" on public.subject_tasks
  for insert to authenticated with check (auth.uid() = user_id);
create policy "subject_tasks_update_own" on public.subject_tasks
  for update to authenticated using (auth.uid() = user_id);
create policy "subject_tasks_delete_own" on public.subject_tasks
  for delete to authenticated using (auth.uid() = user_id);

-- quick_notes
create policy "quick_notes_select_own" on public.quick_notes
  for select to authenticated using (auth.uid() = user_id);
create policy "quick_notes_insert_own" on public.quick_notes
  for insert to authenticated with check (auth.uid() = user_id);
create policy "quick_notes_update_own" on public.quick_notes
  for update to authenticated using (auth.uid() = user_id);
create policy "quick_notes_delete_own" on public.quick_notes
  for delete to authenticated using (auth.uid() = user_id);

-- pomodoro_sessions
create policy "pomodoro_select_own" on public.pomodoro_sessions
  for select to authenticated using (auth.uid() = user_id);
create policy "pomodoro_insert_own" on public.pomodoro_sessions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "pomodoro_delete_own" on public.pomodoro_sessions
  for delete to authenticated using (auth.uid() = user_id);

-- calendar_cache_events
create policy "calendar_cache_select_own" on public.calendar_cache_events
  for select to authenticated using (auth.uid() = user_id);
create policy "calendar_cache_insert_own" on public.calendar_cache_events
  for insert to authenticated with check (auth.uid() = user_id);
create policy "calendar_cache_update_own" on public.calendar_cache_events
  for update to authenticated using (auth.uid() = user_id);
create policy "calendar_cache_delete_own" on public.calendar_cache_events
  for delete to authenticated using (auth.uid() = user_id);
