-- Migrasi incremental untuk database Supabase yang sudah berjalan:
-- Menambahkan tabel public.kegiatan_panitia dan menghubungkan public.absensi ke panitia kegiatan.

create table if not exists public.kegiatan_panitia (
  id            uuid        primary key default gen_random_uuid(),
  kegiatan_id   uuid        not null references public.kegiatan(id) on delete cascade,
  anggota_id    uuid        references public.anggota(id) on delete set null,
  npm           text        not null,
  nama_lengkap  text        not null,
  jabatan       text        not null,
  divisi        text        not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (kegiatan_id, npm)
);

alter table public.absensi
  add column if not exists panitia_id uuid references public.kegiatan_panitia(id) on delete cascade;

alter table public.absensi
  alter column anggota_id drop not null;

create unique index if not exists idx_absensi_kegiatan_panitia_unique
  on public.absensi(kegiatan_id, panitia_id)
  where panitia_id is not null;

create or replace trigger trg_kegiatan_panitia_updated_at
  before update on public.kegiatan_panitia
  for each row execute function public.handle_updated_at();

alter table public.kegiatan_panitia enable row level security;

drop policy if exists "kegiatan_panitia: admin full access" on public.kegiatan_panitia;
drop policy if exists "kegiatan_panitia: petugas select"    on public.kegiatan_panitia;

create policy "kegiatan_panitia: admin full access"
  on public.kegiatan_panitia for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "kegiatan_panitia: petugas select"
  on public.kegiatan_panitia for select
  to authenticated
  using (public.is_active_user());

create index if not exists idx_kegiatan_panitia_kegiatan on public.kegiatan_panitia(kegiatan_id);
create index if not exists idx_kegiatan_panitia_npm      on public.kegiatan_panitia(npm);
create index if not exists idx_absensi_panitia           on public.absensi(panitia_id);

grant all privileges on table public.kegiatan_panitia to anon, authenticated, service_role;
