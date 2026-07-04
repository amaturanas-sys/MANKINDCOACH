-- ======================================================================
--  MankindFactory - Vinculación fuerte token → paciente (enrolamiento)
--  Ejecuta en: Supabase -> SQL Editor -> New query -> Run.
--
--  Problema que cierra: antes cualquier "paciente" autenticado podía enviar
--  formularios con el token de OTRO paciente (suplantación / envenenamiento
--  de datos) y el dossier resolvía su destinatario desde datos escribibles
--  por pacientes (posible desvío de documentos clínicos).
--
--  Modelo: el PRIMER paciente que reclama un token queda vinculado de forma
--  atómica e inmutable (clave primaria coach_id+patient_token). A partir de
--  ahí, solo esa cuenta puede enviar formularios con ese token, y el dossier
--  se entrega únicamente a esa cuenta. El coach ve quién reclamó cada enlace
--  y puede revocar el vínculo para reemitir la invitación.
-- ======================================================================

create table if not exists public.patient_links (
  coach_id      uuid not null,
  patient_token text not null,
  patient_id    uuid not null references auth.users (id) on delete cascade,
  patient_email text,
  patient_name  text,
  created_at    timestamptz not null default now(),
  primary key (coach_id, patient_token)   -- un token = UNA cuenta, primera en reclamar
);

alter table public.patient_links enable row level security;

-- El paciente reclama su enlace (la PK garantiza un único reclamo por token).
drop policy if exists pl_patient_insert on public.patient_links;
create policy pl_patient_insert on public.patient_links
  for insert with check (auth.uid() = patient_id);

-- El paciente ve solo sus propios vínculos.
drop policy if exists pl_patient_select on public.patient_links;
create policy pl_patient_select on public.patient_links
  for select using (auth.uid() = patient_id);

-- El coach ve los vínculos de sus tokens (verificación de identidad).
drop policy if exists pl_coach_select on public.patient_links;
create policy pl_coach_select on public.patient_links
  for select using (auth.uid() = coach_id);

-- El coach puede revocar un vínculo (reemitir invitación / expulsar intruso).
drop policy if exists pl_coach_delete on public.patient_links;
create policy pl_coach_delete on public.patient_links
  for delete using (auth.uid() = coach_id);

-- Sin UPDATE para nadie: el vínculo es inmutable (solo crear / revocar).

-- ----------------------------------------------------------------------
-- Migración: vincular a los pacientes que YA enviaron formularios.
-- Primer reclamante por (coach, token), consistente con la semántica nueva.
-- ----------------------------------------------------------------------
insert into public.patient_links (coach_id, patient_token, patient_id, patient_email, patient_name, created_at)
select distinct on (coach_id, patient_token)
  coach_id, patient_token, patient_id, patient_email, patient_name, created_at
from public.patient_submissions
where patient_token is not null
order by coach_id, patient_token, created_at asc
on conflict (coach_id, patient_token) do nothing;

-- ----------------------------------------------------------------------
-- ENDURECER patient_submissions: solo se puede INSERTAR con un token que la
-- propia cuenta tenga vinculado. (Reemplaza la política permisiva anterior,
-- que aceptaba cualquier coach_id/patient_token.)
-- ----------------------------------------------------------------------
drop policy if exists ps_patient_insert on public.patient_submissions;
create policy ps_patient_insert on public.patient_submissions
  for insert with check (
    auth.uid() = patient_id
    and exists (
      select 1 from public.patient_links l
      where l.coach_id      = patient_submissions.coach_id
        and l.patient_token = patient_submissions.patient_token
        and l.patient_id    = auth.uid()
    )
  );
