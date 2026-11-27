# Product Requirements Document (PRD)
# Sistem Informasi Kesekretariatan HIMA

**Versi:** 1.0  
**Target Stack:** [Next.js (App Router)](https://nextjs.org/docs/app) + [Supabase](https://supabase.com/docs)  
**Target Implementasi:** Web responsif (desktop untuk Admin, mobile-friendly untuk Petugas Absen)  

## 1. Ringkasan Produk & Tujuan

Sistem Informasi Kesekretariatan HIMA adalah aplikasi web terpusat untuk membantu Divisi Kesekretariatan HIMA dalam mengelola data anggota, inventaris barang sekretariat, daftar kegiatan, dan absensi kegiatan berbasis pemindaian barcode NPM langsung di browser.

**Tujuan utama:**
- Menyatukan pencatatan data anggota HIMA dan inventaris barang sekretariat dalam satu database terstruktur.
- Mempercepat proses absensi kegiatan melalui pemindaian barcode unik berbasis **NPM (Nomor Pokok Mahasiswa)** oleh petugas menggunakan kamera HP di web.
- Menyediakan transparansi operasional melalui **log aktivitas** yang otomatis mencatat setiap perubahan data dan proses absensi di dashboard admin.

## 2. Tech Stack & Arsitektur

| Lapisan | Teknologi | Peran |
| :--- | :--- | :--- |
| **Framework** | [Next.js App Router](https://nextjs.org/docs/app) + TypeScript | UI, routing, Middleware proteksi role, dan Server Actions / Route Handlers. |
| **Styling & UI** | [Tailwind CSS](https://tailwindcss.com/docs/guides/nextjs) + [shadcn/ui](https://ui.shadcn.com/docs/installation/next) | Komponen tabel, form, dialog, badge, dan layout dashboard responsif. |
| **Database & Auth** | [Supabase](https://supabase.com/docs/guides/database/overview) (PostgreSQL + [Supabase Auth](https://supabase.com/docs/guides/auth)) | Penyimpanan data relasional, autentikasi email/password, dan sesi login. |
| **Keamanan Data** | [Supabase Row Level Security (RLS)](https://supabase.com/docs/guides/database/postgres/row-level-security) | Pembatasan akses baca/tulis per role langsung di level database. |
| **Generator Barcode** | [JsBarcode](https://github.com/lindell/JsBarcode) | Generate barcode 1D (format `CODE128`) dari NPM anggota untuk ditampilkan/diunduh. |
| **Scanner Kamera** | [html5-qrcode](https://github.com/mebjas/html5-qrcode) | Pemindaian barcode langsung dari kamera HP/laptop di halaman web petugas. |
| **Hosting** | [Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) | Deployment Next.js otomatis dengan HTTPS (syarat wajib akses kamera browser). |

## 3. Role Pengguna & Matriks Hak Akses (RBAC)

Sistem memiliki dua role yang tersimpan pada tabel `profiles`: **`admin`** dan **`petugas`**.

| Fitur / Modul | Admin | Petugas Absen |
| :--- | :---: | :---: |
| Login & Logout | Ya | Ya |
| Dashboard Ringkasan & Log Aktivitas | Ya (Lihat & Filter) | Tidak |
| Kelola Petugas (Buat, Edit, Nonaktifkan Akun) | Ya (CRUD) | Tidak |
| Data Anggota HIMA & Generate Barcode NPM | Ya (CRUD + Download Barcode) | Lihat saja (untuk validasi scan) |
| Inventaris Barang Sekretariat | Ya (CRUD) | Tidak |
| Pengelolaan Kegiatan | Ya (CRUD + Export Rekap) | Lihat daftar kegiatan aktif |
| Absensi Scan Barcode NPM | Ya (Lihat, Scan, & Edit Status) | Ya (Scan & Input Manual NPM) |

## 4. Spesifikasi Fitur Fungsional

### 4.1 Autentikasi & Kelola Petugas
- Login menggunakan email dan password melalui [Supabase Auth](https://supabase.com/docs/guides/auth).
- Tidak ada halaman registrasi publik; akun baru hanya dibuat oleh **Admin**.
- Pada menu **Kelola Petugas**, Admin dapat:
  - Membuat akun petugas baru (nama, email, password awal, role `petugas` atau `admin`) melalui Next.js Server Action / API Route menggunakan `SUPABASE_SERVICE_ROLE_KEY`.
  - Mengubah nama, mengubah role, atau menonaktifkan akun petugas (`is_active = false`).
  - Memastikan petugas yang dinonaktifkan tidak dapat mengakses halaman scanner.
- Next.js Middleware memeriksa sesi login dan role pengguna sebelum mengakses `/admin/*` atau `/petugas/*`.

### 4.2 Pengelolaan Data Anggota HIMA & Barcode NPM
- Admin dapat menambah, mengubah, mencari, memfilter, dan menghapus data anggota.
- Field data anggota: `npm` (unik, wajib), `nama_lengkap`, `angkatan`, `divisi`, `jabatan`, `no_hp` (opsional), dan `status` (`aktif` / `nonaktif`).
- Setiap anggota otomatis memiliki tampilan barcode yang digenerate dari `npm` menggunakan [JsBarcode](https://github.com/lindell/JsBarcode) (`CODE128`) beserta tombol **Unduh PNG** agar anggota dapat menyimpan barcode di HP atau mencetaknya.

### 4.3 Pengelolaan Inventaris Barang Sekretariat
- Admin dapat mengelola daftar barang sekretariat dengan field: `kode_barang` (unik), `nama_barang`, `kategori`, `jumlah`, `kondisi` (`baik`, `rusak_ringan`, `rusak_berat`, `hilang`), `lokasi_simpan`, dan `catatan`.
- Menyediakan fitur pencarian dan filter berdasarkan kategori serta kondisi barang.

### 4.4 Pengelolaan Kegiatan
- Admin dapat membuat dan mengelola jadwal kegiatan: `nama_kegiatan`, `deskripsi`, `tanggal`, `waktu_mulai`, `waktu_selesai`, `lokasi`, dan `status` (`terjadwal`, `berlangsung`, `selesai`).
- Halaman detail kegiatan menampilkan daftar anggota yang sudah absen, jumlah total hadir, dan tombol **Export CSV** rekap absensi.

### 4.5 Absensi Scan Barcode di Web
- Petugas membuka halaman `/petugas` lalu memilih kegiatan yang berstatus `berlangsung`.
- Halaman `/petugas/scan/[kegiatanId]` mengaktifkan kamera belakang HP menggunakan [html5-qrcode](https://github.com/mebjas/html5-qrcode).
- **Alur pemindaian:**
  1. Anggota menunjukkan barcode NPM (dari HP atau kartu) ke kamera petugas.
  2. Sistem membaca string NPM dan mengirim request ke server bersama `kegiatan_id`.
  3. Server memvalidasi apakah NPM terdaftar di tabel `anggota`.
  4. Server mengecek apakah pasangan `(kegiatan_id, anggota_id)` sudah tercatat di tabel `absensi`.
  5. Jika valid dan belum absen, data disimpan dengan `waktu_absen` dan `dicatat_oleh` (ID petugas), lalu tampilkan notifikasi sukses (nama, NPM, divisi) disertai jeda singkat (*cooldown* ~1,5 detik) agar tidak ter-scan berulang kali.
  6. Jika sudah absen atau NPM tidak ditemukan, tampilkan peringatan jelas tanpa menyimpan data ganda.
- Tersedia kolom **Input NPM Manual** sebagai cadangan jika kamera bermasalah atau barcode anggota buram.

### 4.6 Dashboard Admin & Log Aktivitas (Audit Trail)
- Dashboard Admin menampilkan ringkasan: total anggota aktif, total item inventaris, jumlah kegiatan, dan daftar aktivitas terbaru.
- Halaman **Log Aktivitas** (`/admin/logs`) mencatat setiap aksi penting secara otomatis:
  - Siapa pelakunya (`actor_id`, nama, role).
  - Jenis aksi (`CREATE`, `UPDATE`, `DELETE`, `SCAN_ABSEN`, `TOGGLE_PETUGAS`).
  - Modul/entitas target (`anggota`, `inventaris`, `kegiatan`, `absensi`, `profiles`).
  - Ringkasan deskripsi dan metadata JSON perubahan (`details`).
  - Waktu kejadian (`created_at`).
- Admin dapat memfilter log berdasarkan modul, pelaku, dan rentang tanggal.

## 5. Skema Database (Supabase PostgreSQL)

```sql
-- 1. Profil & Role Pengguna (terhubung ke auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama_lengkap text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'petugas')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Data Anggota HIMA
create table public.anggota (
  id uuid primary key default gen_random_uuid(),
  npm text not null unique,
  nama_lengkap text not null,
  angkatan text not null,
  divisi text not null,
  jabatan text,
  no_hp text,
  status text not null default 'aktif' check (status in ('aktif', 'nonaktif')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Inventaris Barang Sekretariat
create table public.inventaris (
  id uuid primary key default gen_random_uuid(),
  kode_barang text not null unique,
  nama_barang text not null,
  kategori text not null,
  jumlah integer not null default 1 check (jumlah >= 0),
  kondisi text not null default 'baik' check (kondisi in ('baik', 'rusak_ringan', 'rusak_berat', 'hilang')),
  lokasi_simpan text,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Kegiatan HIMA
create table public.kegiatan (
  id uuid primary key default gen_random_uuid(),
  nama_kegiatan text not null,
  deskripsi text,
  tanggal date not null,
  waktu_mulai time not null,
  waktu_selesai time,
  lokasi text not null,
  status text not null default 'terjadwal' check (status in ('terjadwal', 'berlangsung', 'selesai')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 5. Absensi Kegiatan (anti-duplikat per kegiatan & anggota)
create table public.absensi (
  id uuid primary key default gen_random_uuid(),
  kegiatan_id uuid not null references public.kegiatan(id) on delete cascade,
  anggota_id uuid not null references public.anggota(id) on delete cascade,
  waktu_absen timestamptz not null default now(),
  metode text not null default 'scan' check (metode in ('scan', 'manual')),
  dicatat_oleh uuid references public.profiles(id) on delete set null,
  unique (kegiatan_id, anggota_id)
);

-- 6. Log Aktivitas (Audit Trail)
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
```

**Aturan Ringkas Row Level Security (RLS):**
- Aktifkan RLS pada semua tabel di atas.
- Buat helper function SQL `public.is_admin()` yang mengecek `role = 'admin'` dan `is_active = true` pada `public.profiles` untuk `auth.uid()`.
- `profiles`, `inventaris`, `kegiatan`, `anggota`: `admin` memiliki akses penuh (`SELECT`, `INSERT`, `UPDATE`, `DELETE`); `petugas` aktif hanya memiliki akses `SELECT` pada `anggota`, `kegiatan`, dan `profiles` miliknya sendiri.
- `absensi`: `admin` memiliki akses penuh; `petugas` aktif dapat `SELECT` dan `INSERT` absensi.
- `activity_logs`: hanya `admin` yang dapat `SELECT`; semua pengguna terautentikasi aktif dapat `INSERT` log atas `actor_id = auth.uid()` (atau melalui Server Action).

## 6. Struktur Halaman (Next.js App Router)

| Route | Akses | Fungsi Utama |
| :--- | :--- | :--- |
| `/login` | Publik | Halaman login email & password. |
| `/admin` | Admin | Dashboard ringkasan KPI & aktivitas terbaru. |
| `/admin/anggota` | Admin | CRUD anggota + modal preview & unduh barcode NPM. |
| `/admin/inventaris` | Admin | CRUD inventaris barang sekretariat. |
| `/admin/kegiatan` | Admin | CRUD daftar kegiatan & ubah status kegiatan. |
| `/admin/kegiatan/[id]` | Admin | Detail kegiatan, daftar hadir realtime/terkini, & export CSV. |
| `/admin/petugas` | Admin | Kelola akun petugas absen (tambah, edit, aktif/nonaktif). |
| `/admin/logs` | Admin | Tabel log aktivitas lengkap dengan filter modul & tanggal. |
| `/petugas` | Petugas & Admin | Daftar kegiatan berstatus `berlangsung` untuk dipilih sebelum scan. |
| `/petugas/scan/[kegiatanId]` | Petugas & Admin | Scanner kamera barcode NPM + input manual + daftar hadir terbaru. |

## 7. Kebutuhan Non-Fungsional & Keamanan

- **Mobile-first pada halaman scanner:** Tombol dan area kamera nyaman dioperasikan satu tangan di layar HP.
- **Keamanan kunci API:** `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` boleh di client, sedangkan `SUPABASE_SERVICE_ROLE_KEY` wajib hanya digunakan di server (Server Actions / API Routes) dan tidak pernah di-commit ke Git.
- **HTTPS wajib untuk produksi:** Akses kamera browser (`navigator.mediaDevices.getUserMedia`) hanya berjalan di `localhost` atau domain HTTPS (otomatis tersedia saat deploy di Vercel).
- **Validasi input:** Gunakan validasi skema (misalnya Zod) pada setiap form dan endpoint sebelum menulis ke database.

## 8. Urutan Implementasi (Milestone untuk Antigravity)

1. **Fase 1 — Setup & Database:** Inisialisasi proyek Next.js + Tailwind + shadcn/ui, konfigurasi `.env.local`, dan jalankan skema SQL + RLS di Supabase.
2. **Fase 2 — Auth, Middleware & Kelola Petugas:** Bangun halaman `/login`, proteksi route berdasarkan role, fungsi helper `recordActivityLog()`, dan modul `/admin/petugas`.
3. **Fase 3 — Master Data (Anggota & Inventaris):** Bangun CRUD `/admin/anggota` lengkap dengan generator barcode NPM (`JsBarcode`) dan CRUD `/admin/inventaris`.
4. **Fase 4 — Kegiatan & Scanner Absensi:** Bangun CRUD `/admin/kegiatan`, halaman detail & export CSV, serta halaman `/petugas/scan/[kegiatanId]` menggunakan `html5-qrcode` + anti-duplikat absensi.
5. **Fase 5 — Dashboard, Log Aktivitas & Deploy:** Lengkapi statistik `/admin`, filter `/admin/logs`, uji coba scan langsung lewat HP setelah deploy ke Vercel.
