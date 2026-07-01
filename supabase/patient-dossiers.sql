-- ======================================================================
--  MankindFactory - Dossiers para el paciente (documentos exportados)
--  Ejecuta en: Supabase -> SQL Editor -> New query -> Run.
--
--  Al exportar un dossier (HTML/PDF), el coach lo descarga localmente Y lo sube
--  al portal del paciente. El paciente lo descarga desde su portal; al hacerlo,
--  el archivo se elimina del servidor para ahorrar espacio.
--
--  Convención de ruta en Storage: {coach_id}/{patient_id}/{archivo}
-- ======================================================================

create table if not exists public.patient_dossiers (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null,
  patient_id    uuid not null references auth.users (id) on delete cascade,
  patient_token text,
  name          text not null,
  format        text not null check (format in ('html', 'pdf')),
  storage_path  text not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_patient_dossiers_patient
  on public.patient_dossiers (patient_id, created_at desc);

alter table public.patient_dossiers enable row level security;

-- El coach crea dossiers dirigidos a un paciente.
drop policy if exists pd_coach_insert on public.patient_dossiers;
create policy pd_coach_insert on public.patient_dossiers
  for insert with check (auth.uid() = coach_id);
-- El coach ve / borra los suyos.
drop policy if exists pd_coach_select on public.patient_dossiers;
create policy pd_coach_select on public.patient_dossiers
  for select using (auth.uid() = coach_id);
drop policy if exists pd_coach_delete on public.patient_dossiers;
create policy pd_coach_delete on public.patient_dossiers
  for delete using (auth.uid() = coach_id);
-- El paciente ve / borra los dirigidos a él (al descargar se borra).
drop policy if exists pd_patient_select on public.patient_dossiers;
create policy pd_patient_select on public.patient_dossiers
  for select using (auth.uid() = patient_id);
drop policy if exists pd_patient_delete on public.patient_dossiers;
create policy pd_patient_delete on public.patient_dossiers
  for delete using (auth.uid() = patient_id);

-- Bucket privado de Storage.
insert into storage.buckets (id, name, public)
values ('dossiers', 'dossiers', false)
on conflict (id) do nothing;

-- Políticas de Storage (ruta {coach_id}/{patient_id}/archivo).
drop policy if exists "dossiers coach write" on storage.objects;
create policy "dossiers coach write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dossiers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dossiers coach read" on storage.objects;
create policy "dossiers coach read" on storage.objects
  for select to authenticated
  using (bucket_id = 'dossiers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dossiers coach delete" on storage.objects;
create policy "dossiers coach delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dossiers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dossiers patient read" on storage.objects;
create policy "dossiers patient read" on storage.objects
  for select to authenticated
  using (bucket_id = 'dossiers' and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists "dossiers patient delete" on storage.objects;
create policy "dossiers patient delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dossiers' and (storage.foldername(name))[2] = auth.uid()::text);
