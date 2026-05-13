-- WhatsApp finance bot: vincula numeros con usuarios y guarda mensajes procesados.

create table if not exists public.whatsapp_user_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phone_number text not null,
  default_account_id uuid references public.accounts (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (phone_number)
);

create table if not exists public.whatsapp_finance_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  whatsapp_message_id text,
  from_phone text not null,
  message_type text not null default 'text',
  raw_text text,
  parsed jsonb,
  transaction_id uuid references public.transactions (id) on delete set null,
  status text not null default 'received'
    check (status in ('received', 'pending_confirmation', 'saved', 'cancelled', 'ignored', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (whatsapp_message_id)
);

create index if not exists whatsapp_user_links_phone_idx
  on public.whatsapp_user_links (phone_number)
  where active = true;

create index if not exists whatsapp_finance_events_user_status_idx
  on public.whatsapp_finance_events (user_id, status, created_at desc);

alter table public.whatsapp_user_links enable row level security;
alter table public.whatsapp_finance_events enable row level security;

create policy "whatsapp_user_links_select_own" on public.whatsapp_user_links
  for select to authenticated using (auth.uid() = user_id);
create policy "whatsapp_user_links_insert_own" on public.whatsapp_user_links
  for insert to authenticated with check (auth.uid() = user_id);
create policy "whatsapp_user_links_update_own" on public.whatsapp_user_links
  for update to authenticated using (auth.uid() = user_id);
create policy "whatsapp_user_links_delete_own" on public.whatsapp_user_links
  for delete to authenticated using (auth.uid() = user_id);

create policy "whatsapp_finance_events_select_own" on public.whatsapp_finance_events
  for select to authenticated using (auth.uid() = user_id);
