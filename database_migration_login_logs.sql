-- Create login_logs table to store each successful login event
create table if not exists public.login_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_login_logs_created_at on public.login_logs (created_at desc);
create index if not exists idx_login_logs_user_id_created_at on public.login_logs (user_id, created_at desc);

-- Enable RLS
alter table public.login_logs enable row level security;

-- Policies
-- Admins can read all logs
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'login_logs' and policyname = 'login_logs select admin'
  ) then
    create policy "login_logs select admin" on public.login_logs
      for select
      using (public.is_admin(auth.uid()));
  end if;
end $$;

-- Users can read only their own logs
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'login_logs' and policyname = 'login_logs select self'
  ) then
    create policy "login_logs select self" on public.login_logs
      for select
      using (user_id = auth.uid());
  end if;
end $$;

-- Users can insert their own login event
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'login_logs' and policyname = 'login_logs insert self'
  ) then
    create policy "login_logs insert self" on public.login_logs
      for insert
      with check (user_id = auth.uid());
  end if;
end $$;

-- (Optional) Only admins can delete logs
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'login_logs' and policyname = 'login_logs delete admin'
  ) then
    create policy "login_logs delete admin" on public.login_logs
      for delete
      using (public.is_admin(auth.uid()));
  end if;
end $$;

-- SECURITY DEFINER function to reliably log a login event
create or replace function public.log_login()
returns void
language plpgsql
security definer
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return; -- no session context
  end if;
  insert into public.login_logs(user_id) values (uid);
end;
$$;


