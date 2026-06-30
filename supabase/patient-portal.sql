-- ======================================================================
--  MankindFactory - Portal de pacientes (envios de formularios)
--  Ejecuta en: Supabase -> SQL Editor -> New query -> Run.
--
--  Los pacientes se registran (Auth) y suben sus JSON de ingreso/seguimiento.
--  Cada envio queda ligado a SU coach (coach_id) y solo el coach lo ve.
-- ======================================================================

create table if not exists public.patient_submissions (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null,                       -- coach destinatario (su user id)
  patient_id    uuid not null references auth.users (id) on delete cascade,
  patient_token text,                                -- id del paciente en la ficha del coach
  patient_email text,
  patient_name  text,
  kind          text not null check (kind in ('intake', 'progress')),
  data          jsonb not null,                      -- contenido del formulario
  status        text not null default 'pending'
                  check (status in ('pending', 'imported', 'archived')),
  created_at    timestamptz not null default now()
);

-- Si la tabla ya existía sin patient_token, añadirlo (idempotente):
alter table public.patient_submissions add column if not exists patient_token text;

create index if not exists idx_patient_submissions_coach
  on public.patient_submissions (coach_id, status, created_at desc);

alter table public.patient_submissions enable row level security;

-- El paciente puede CREAR sus propios envios.
drop policy if exists ps_patient_insert on public.patient_submissions;
create policy ps_patient_insert on public.patient_submissions
  for insert with check (auth.uid() = patient_id);

-- El paciente puede VER sus propios envios.
drop policy if exists ps_patient_select_own on public.patient_submissions;
create policy ps_patient_select_own on public.patient_submissions
  for select using (auth.uid() = patient_id);

-- El coach puede VER los envios dirigidos a el.
drop policy if exists ps_coach_select on public.patient_submissions;
create policy ps_coach_select on public.patient_submissions
  for select using (auth.uid() = coach_id);

-- El coach puede MARCAR (importado/archivado) los envios dirigidos a el.
drop policy if exists ps_coach_update on public.patient_submissions;
create policy ps_coach_update on public.patient_submissions
  for update using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

-- El coach puede PURGAR (borrar) sus envios tras descargarlos.
drop policy if exists ps_coach_delete on public.patient_submissions;
create policy ps_coach_delete on public.patient_submissions
  for delete using (auth.uid() = coach_id);
