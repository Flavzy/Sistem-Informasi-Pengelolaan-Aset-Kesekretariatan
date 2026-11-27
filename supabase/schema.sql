-- =============================================================================
-- supabase/schema.sql
-- Skema Database Sistem Informasi Kesekretariatan HIMA
-- =============================================================================
-- Cara menjalankan:
--   1. Buka https://app.supabase.com > pilih proyek Anda
--   2. Navigasi ke menu "SQL Editor" di sidebar kiri
--   3. Klik "New Query", paste seluruh isi file ini, lalu klik "Run"
--   4. Pastikan tidak ada error merah sebelum lanjut ke Fase 2
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- BAGIAN 0: EKSTENSI
-- Aktifkan pgcrypto untuk gen_random_uuid() jika belum tersedia
-- (Supabase biasanya sudah mengaktifkannya secara default)
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";


-- =============================================================================
-- BAGIAN 1: DEFINISI TABEL (DDL)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabel 1: profiles
-- Menyimpan profil pengguna (admin & petugas) yang terhubung ke auth.users.
-- Dibuat otomatis via trigger saat user baru dibuat di Supabase Auth.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  nama_lengkap  text        not null,
  email         text        not null unique,
  role          text        not null check (role in ('admin', 'petugas')),
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Profil pengguna sistem (admin & petugas) yang terhubung ke Supabase Auth.';
comment on column public.profiles.role is
  'Role pengguna: "admin" memiliki akses penuh, "petugas" hanya dapat scan absensi.';
comment on column public.profiles.is_active is
  'Jika false, pengguna tidak dapat login atau mengakses sistem.';


-- ─────────────────────────────────────────────────────────────────────────────
-- Tabel 2: anggota
-- Data anggota HIMA. Barcode NPM digenerate di client dari kolom `npm`.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.anggota (
  id            uuid        primary key default gen_random_uuid(),
  npm           text        not null unique,
  nama_lengkap  text        not null,
  angkatan      text        not null,
  divisi        text        not null,
  jabatan       text,
  no_hp         text,
  status        text        not null default 'aktif'
                            check (status in ('aktif', 'nonaktif')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.anggota is
  'Data anggota HIMA. Kolom npm digunakan sebagai nilai barcode CODE128.';
comment on column public.anggota.npm is
  'Nomor Pokok Mahasiswa — unik, wajib, digunakan sebagai payload barcode.';


-- ─────────────────────────────────────────────────────────────────────────────
-- Tabel 3: inventaris
-- Inventaris barang sekretariat HIMA.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.inventaris (
  id            uuid        primary key default gen_random_uuid(),
  kode_barang   text        not null unique,
  nama_barang   text        not null,
  kategori      text        not null,
  jumlah        integer     not null default 1 check (jumlah >= 0),
  kondisi       text        not null default 'baik'
                            check (kondisi in ('baik', 'rusak_ringan', 'rusak_berat', 'hilang')),
  lokasi_simpan text,
  catatan       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.inventaris is
  'Daftar inventaris barang sekretariat HIMA.';
comment on column public.inventaris.kondisi is
  'Kondisi fisik barang: baik | rusak_ringan | rusak_berat | hilang.';


-- ─────────────────────────────────────────────────────────────────────────────
-- Tabel 4: kegiatan
-- Jadwal dan detail kegiatan HIMA.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.kegiatan (
  id              uuid        primary key default gen_random_uuid(),
  nama_kegiatan   text        not null,
  deskripsi       text,
  tanggal         date        not null,
  waktu_mulai     time        not null,
  waktu_selesai   time,
  lokasi          text        not null,
  status          text        not null default 'terjadwal'
                              check (status in ('terjadwal', 'berlangsung', 'selesai')),
  created_by      uuid        references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

comment on table public.kegiatan is
  'Jadwal kegiatan HIMA. Hanya kegiatan berstatus "berlangsung" yang aktif di halaman scanner.';
comment on column public.kegiatan.status is
  'Status kegiatan: terjadwal | berlangsung | selesai. Petugas hanya bisa scan saat "berlangsung".';


-- ─────────────────────────────────────────────────────────────────────────────
-- Tabel 5: kegiatan_panitia
-- Daftar panitia per kegiatan beserta jabatan & divisi kepanitiaan.
-- Diimpor dari Excel (npm, nama_lengkap, jabatan, divisi) dan dipakai saat absensi.
-- ─────────────────────────────────────────────────────────────────────────────
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

comment on table public.kegiatan_panitia is
  'Daftar panitia per kegiatan (diimpor dari Excel) sebagai sumber validasi & peran absensi.';
comment on column public.kegiatan_panitia.jabatan is
  'Jabatan kepanitiaan pada kegiatan (misal: Ketua Pelaksana, CO Acara, Anggota).';
comment on column public.kegiatan_panitia.divisi is
  'Divisi kepanitiaan pada kegiatan (misal: Inti, Acara, Keamanan, PDD).';


-- ─────────────────────────────────────────────────────────────────────────────
-- Tabel 6: absensi
-- Rekaman kehadiran panitia per kegiatan.
-- Constraint UNIQUE mencegah duplikat scan per kegiatan & panitia/anggota.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.absensi (
  id            uuid        primary key default gen_random_uuid(),
  kegiatan_id   uuid        not null references public.kegiatan(id) on delete cascade,
  panitia_id    uuid        references public.kegiatan_panitia(id) on delete cascade,
  anggota_id    uuid        references public.anggota(id) on delete cascade,
  waktu_absen   timestamptz not null default now(),
  metode        text        not null default 'scan'
                            check (metode in ('scan', 'manual')),
  dicatat_oleh  uuid        references public.profiles(id) on delete set null,
  unique (kegiatan_id, anggota_id)
);

-- Migrasi aman jika tabel absensi sudah dibuat sebelumnya tanpa kolom panitia_id
alter table public.absensi
  add column if not exists panitia_id uuid references public.kegiatan_panitia(id) on delete cascade;

alter table public.absensi
  alter column anggota_id drop not null;

create unique index if not exists idx_absensi_kegiatan_panitia_unique
  on public.absensi(kegiatan_id, panitia_id)
  where panitia_id is not null;

comment on table public.absensi is
  'Rekaman absensi panitia per kegiatan. Constraint UNIQUE mencegah scan ganda.';
comment on column public.absensi.metode is
  'Metode pencatatan: "scan" via kamera barcode, "manual" via input NPM manual.';
comment on column public.absensi.dicatat_oleh is
  'ID petugas/admin yang mencatat absensi ini.';


-- ─────────────────────────────────────────────────────────────────────────────
-- Tabel 7: activity_logs
-- Audit trail seluruh aksi penting dalam sistem.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.activity_logs (
  id            uuid        primary key default gen_random_uuid(),
  actor_id      uuid        references public.profiles(id) on delete set null,
  actor_role    text,
  action        text        not null,
  entity_type   text        not null,
  entity_id     uuid,
  description   text        not null,
  details       jsonb,
  created_at    timestamptz not null default now()
);

comment on table public.activity_logs is
  'Audit trail semua aksi penting: CREATE, UPDATE, DELETE, SCAN_ABSEN, TOGGLE_PETUGAS.';
comment on column public.activity_logs.action is
  'Jenis aksi: CREATE | UPDATE | DELETE | SCAN_ABSEN | TOGGLE_PETUGAS.';
comment on column public.activity_logs.entity_type is
  'Modul/entitas yang dimodifikasi: anggota | inventaris | kegiatan | panitia | absensi | profiles.';
comment on column public.activity_logs.details is
  'Metadata JSON perubahan, misal { before: {...}, after: {...} }.';


-- =============================================================================
-- BAGIAN 2: TRIGGER UNTUK updated_at
-- Otomatis perbarui kolom updated_at saat row diupdate.
-- =============================================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Terapkan trigger ke tabel yang memiliki kolom updated_at
create or replace trigger trg_anggota_updated_at
  before update on public.anggota
  for each row execute function public.handle_updated_at();

create or replace trigger trg_inventaris_updated_at
  before update on public.inventaris
  for each row execute function public.handle_updated_at();

create or replace trigger trg_kegiatan_panitia_updated_at
  before update on public.kegiatan_panitia
  for each row execute function public.handle_updated_at();


-- =============================================================================
-- BAGIAN 3: HELPER FUNCTION is_admin()
-- Memeriksa apakah pengguna yang sedang login memiliki role 'admin'
-- dan status is_active = true pada tabel profiles.
-- Digunakan sebagai kondisi di policy RLS agar query lebih bersih.
-- =============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

comment on function public.is_admin() is
  'Mengembalikan TRUE jika user yang sedang login adalah admin aktif.';


-- =============================================================================
-- BAGIAN 4: HELPER FUNCTION is_active_user()
-- Memeriksa apakah pengguna yang sedang login terdaftar dan is_active = true,
-- tanpa memandang role-nya (admin atau petugas).
-- =============================================================================

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
  );
$$;

comment on function public.is_active_user() is
  'Mengembalikan TRUE jika user yang sedang login adalah pengguna aktif (admin atau petugas).';


-- =============================================================================
-- BAGIAN 5: ROW LEVEL SECURITY (RLS)
-- Aktifkan RLS pada semua tabel, lalu definisikan policy per tabel sesuai
-- matriks hak akses di PRD Bagian 3 & 5.
-- =============================================================================

-- Aktifkan RLS
alter table public.profiles         enable row level security;
alter table public.anggota          enable row level security;
alter table public.inventaris       enable row level security;
alter table public.kegiatan         enable row level security;
alter table public.kegiatan_panitia enable row level security;
alter table public.absensi          enable row level security;
alter table public.activity_logs    enable row level security;


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: profiles
-- Admin: akses penuh (SELECT, INSERT, UPDATE, DELETE)
-- Petugas aktif: hanya bisa SELECT profil milik sendiri
-- ─────────────────────────────────────────────────────────────────────────────

-- Hapus policy lama jika ada (idempotent)
drop policy if exists "profiles: admin select all"      on public.profiles;
drop policy if exists "profiles: admin insert"          on public.profiles;
drop policy if exists "profiles: admin update"          on public.profiles;
drop policy if exists "profiles: admin delete"          on public.profiles;
drop policy if exists "profiles: petugas select own"    on public.profiles;

-- Admin: SELECT semua profil
create policy "profiles: admin select all"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- Admin: INSERT profil baru (saat membuat akun petugas)
create policy "profiles: admin insert"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin());

-- Admin: UPDATE profil (ganti nama, role, is_active)
create policy "profiles: admin update"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin: DELETE profil
create policy "profiles: admin delete"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- Petugas aktif: hanya bisa SELECT profil milik sendiri
create policy "profiles: petugas select own"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    and public.is_active_user()
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: anggota
-- Admin: akses penuh (SELECT, INSERT, UPDATE, DELETE)
-- Petugas aktif: SELECT saja (untuk validasi scan barcode)
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "anggota: admin full access"      on public.anggota;
drop policy if exists "anggota: petugas select"         on public.anggota;

-- Admin: akses penuh
create policy "anggota: admin full access"
  on public.anggota for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Petugas aktif: SELECT saja
create policy "anggota: petugas select"
  on public.anggota for select
  to authenticated
  using (public.is_active_user());


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: inventaris
-- Admin: akses penuh
-- Petugas: TIDAK ADA akses (sesuai PRD — petugas tidak perlu lihat inventaris)
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "inventaris: admin full access"   on public.inventaris;

create policy "inventaris: admin full access"
  on public.inventaris for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: kegiatan
-- Admin: akses penuh (SELECT, INSERT, UPDATE, DELETE)
-- Petugas aktif: SELECT saja (untuk memilih kegiatan sebelum scan)
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "kegiatan: admin full access"     on public.kegiatan;
drop policy if exists "kegiatan: petugas select"        on public.kegiatan;

create policy "kegiatan: admin full access"
  on public.kegiatan for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Petugas aktif: SELECT kegiatan (akan difilter di aplikasi untuk status 'berlangsung')
create policy "kegiatan: petugas select"
  on public.kegiatan for select
  to authenticated
  using (public.is_active_user());


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: kegiatan_panitia
-- Admin: akses penuh (SELECT, INSERT, UPDATE, DELETE)
-- Petugas aktif: SELECT saja (untuk validasi scan barcode panitia)
-- ─────────────────────────────────────────────────────────────────────────────

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


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: absensi
-- Admin: akses penuh (SELECT, INSERT, UPDATE, DELETE)
-- Petugas aktif: SELECT dan INSERT (tidak bisa UPDATE/DELETE)
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "absensi: admin full access"      on public.absensi;
drop policy if exists "absensi: petugas select"         on public.absensi;
drop policy if exists "absensi: petugas insert"         on public.absensi;

create policy "absensi: admin full access"
  on public.absensi for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "absensi: petugas select"
  on public.absensi for select
  to authenticated
  using (public.is_active_user());

create policy "absensi: petugas insert"
  on public.absensi for insert
  to authenticated
  with check (
    public.is_active_user()
    -- Pastikan dicatat_oleh adalah dirinya sendiri
    and dicatat_oleh = auth.uid()
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: activity_logs
-- Admin: SELECT saja (melihat log)
-- Semua pengguna aktif: INSERT log dengan actor_id = auth.uid()
-- Tidak ada yang bisa UPDATE atau DELETE log (immutable audit trail)
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "activity_logs: admin select"     on public.activity_logs;
drop policy if exists "activity_logs: authenticated insert" on public.activity_logs;

create policy "activity_logs: admin select"
  on public.activity_logs for select
  to authenticated
  using (public.is_admin());

-- Semua pengguna aktif boleh INSERT log, tapi actor_id harus = uid() sendiri
create policy "activity_logs: authenticated insert"
  on public.activity_logs for insert
  to authenticated
  with check (
    public.is_active_user()
    and actor_id = auth.uid()
  );


-- =============================================================================
-- BAGIAN 6: INDEX UNTUK PERFORMA QUERY
-- =============================================================================

-- Index pada kolom yang sering difilter/join
create index if not exists idx_anggota_npm       on public.anggota(npm);
create index if not exists idx_anggota_status    on public.anggota(status);
create index if not exists idx_kegiatan_status   on public.kegiatan(status);
create index if not exists idx_kegiatan_tanggal  on public.kegiatan(tanggal);
create index if not exists idx_kegiatan_panitia_kegiatan on public.kegiatan_panitia(kegiatan_id);
create index if not exists idx_kegiatan_panitia_npm      on public.kegiatan_panitia(npm);
create index if not exists idx_absensi_kegiatan  on public.absensi(kegiatan_id);
create index if not exists idx_absensi_panitia   on public.absensi(panitia_id);
create index if not exists idx_absensi_anggota   on public.absensi(anggota_id);
create index if not exists idx_logs_actor        on public.activity_logs(actor_id);
create index if not exists idx_logs_entity_type  on public.activity_logs(entity_type);
create index if not exists idx_logs_created_at   on public.activity_logs(created_at desc);
create index if not exists idx_inventaris_kategori on public.inventaris(kategori);
create index if not exists idx_inventaris_kondisi  on public.inventaris(kondisi);


-- =============================================================================
-- BAGIAN 7: HAK AKSES PERAN SUPABASE (GRANTS)
-- Berikan izin akses skema & tabel ke role PostgREST (anon, authenticated, service_role).
-- RLS yang telah dibuat di atas akan mengatur pembatasan barisnya.
-- =============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
grant all privileges on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;


-- =============================================================================
-- SELESAI
-- Setelah script ini berhasil dijalankan:
--   1. Buka Authentication > Providers > Email di Supabase Dashboard
--      dan pastikan email/password diaktifkan.
--   2. Buat akun admin pertama melalui Authentication > Users > "Add user"
--      lalu jalankan INSERT berikut di SQL Editor:
--
--      INSERT INTO public.profiles (id, nama_lengkap, email, role, is_active)
--      VALUES (
--        '<uuid-dari-auth-users>',
--        'Nama Admin',
--        'admin@example.com',
--        'admin',
--        true
--      );
--
--   3. Lanjutkan ke Fase 2: Auth, Middleware & Kelola Petugas.
-- =============================================================================
