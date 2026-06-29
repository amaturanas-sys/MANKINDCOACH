-- ======================================================================
--  MankindFactory · Esquema de base de datos (Supabase / Postgres)
--  Ejecuta este script en: Supabase → SQL Editor → New query → Run.
--
--  Modelo (un coach): cada usuario autenticado guarda UN workspace completo
--  como JSON (clientes, rutinas, métricas, pagos, etc.). La seguridad por fila
--  (RLS) garantiza que cada coach solo puede ver/editar SU propia fila.
-- ======================================================================

create table if not exists public.coach_workspaces (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Mantener updated_at al día en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_coach_workspaces_updated_at on public.coach_workspaces;
create trigger trg_coach_workspaces_updated_at
  before update on public.coach_workspaces
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------
-- Row Level Security: aislamiento total por usuario.
-- ----------------------------------------------------------------------
alter table public.coach_workspaces enable row level security;

drop policy if exists "own workspace · select" on public.coach_workspaces;
create policy "own workspace · select"
  on public.coach_workspaces for select
  using (auth.uid() = user_id);

drop policy if exists "own workspace · insert" on public.coach_workspaces;
create policy "own workspace · insert"
  on public.coach_workspaces for insert
  with check (auth.uid() = user_id);

drop policy if exists "own workspace · update" on public.coach_workspaces;
create policy "own workspace · update"
  on public.coach_workspaces for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own workspace · delete" on public.coach_workspaces;
create policy "own workspace · delete"
  on public.coach_workspaces for delete
  using (auth.uid() = user_id);
