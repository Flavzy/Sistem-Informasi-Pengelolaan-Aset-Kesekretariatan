# Sistem Informasi Kesekretariatan HIMA

Aplikasi web terpusat untuk mengelola operasional Divisi Kesekretariatan HIMA, meliputi pendataan anggota, pembuatan barcode NPM, inventaris barang sekretariat, agenda kegiatan, presensi berbasis pemindaian barcode di browser, manajemen akun petugas, dan audit log aktivitas.

## Fitur Utama

### Dashboard Admin (`/admin`)
- **Ringkasan KPI & Aktivitas Terbaru** (`/admin`): Statistik anggota aktif, item inventaris, total kegiatan, total presensi, serta 10 log aktivitas terbaru.
- **Data Anggota & Barcode NPM** (`/admin/anggota`): CRUD data anggota, filter divisi/angkatan/status, generate barcode `CODE128` dari NPM (unduh PNG & cetak kartu), serta import/export data `.xlsx` lengkap dengan template Excel.
- **Inventaris Barang** (`/admin/inventaris`): CRUD aset sekretariat dengan kategori, jumlah unit, kondisi (`baik`, `rusak_ringan`, `rusak_berat`, `hilang`), lokasi simpan, dan catatan.
- **Kegiatan & Rekap Presensi** (`/admin/kegiatan`, `/admin/kegiatan/[id]`): CRUD agenda kegiatan, ubah status cepat (`terjadwal`, `berlangsung`, `selesai`), pantau daftar hadir, dan export rekap presensi ke CSV.
- **Kelola Petugas & Admin** (`/admin/petugas`): Pembuatan akun baru, pembaruan nama/role, serta aktivasi/penonaktifan akun (`is_active`).
- **Log Aktivitas** (`/admin/logs`): Audit trail untuk aksi `CREATE`, `UPDATE`, `DELETE`, `SCAN_ABSEN`, dan `TOGGLE_PETUGAS` dengan filter modul, aksi, rentang tanggal, pencarian teks, dan detail JSON.

### Portal Petugas Presensi (`/petugas`)
- **Daftar Kegiatan Aktif** (`/petugas`): Menampilkan agenda yang sedang berstatus `berlangsung` beserta info kegiatan `terjadwal` terdekat.
- **Scanner Barcode & Input Manual** (`/petugas/scan/[kegiatanId]`): Pemindaian barcode (`CODE128`, `CODE39`, `QR_CODE`) langsung lewat kamera browser menggunakan `html5-qrcode`, disertai fallback input NPM manual dan daftar presensi terbaru.

> Sistem menggunakan akses tertutup tanpa registrasi publik. Rute `/admin/*` hanya dapat diakses oleh user `admin` aktif, sedangkan rute `/petugas/*` dapat diakses oleh `petugas` maupun `admin` aktif melalui proteksi [src/middleware.ts](src/middleware.ts) dan Row Level Security (RLS) di Supabase.

## Tech Stack

- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/) + React 19 + TypeScript
- **Styling & UI:** Tailwind CSS v3 + `@base-ui/react` + Lucide React
- **Database & Auth:** Supabase (PostgreSQL, Supabase Auth, RLS)
- **Validasi:** Zod
- **Barcode & Scanner:** `jsbarcode` (`CODE128`) & `html5-qrcode`
- **Excel (.xlsx):** `read-excel-file` & `write-excel-file`

## Prasyarat

- Node.js (disarankan v20+ atau v22+) dan `npm`
- Akun dan proyek [Supabase](https://supabase.com/)

## Instalasi & Konfigurasi Lokal

1. **Clone repository dan masuk ke direktori proyek:**
   ```bash
   git clone <url-repository-anda>
   cd Kesektariatan
   ```

2. **Install dependensi:**
   ```bash
   npm install
   ```

3. **Siapkan skema database di Supabase:**
   - Buka proyek Anda di Supabase Dashboard > **SQL Editor** > **New Query**.
   - Salin dan jalankan seluruh isi file [`supabase/schema.sql`](supabase/schema.sql).

4. **Buat akun Admin pertama:**
   - Di Supabase Dashboard, pastikan provider **Email** aktif pada menu **Authentication > Providers**.
   - Tambahkan user baru lewat **Authentication > Users > Add user**.
   - Jalankan query berikut di **SQL Editor** (ganti UUID, nama, dan email sesuai user yang baru dibuat):
     ```sql
     INSERT INTO public.profiles (id, nama_lengkap, email, role, is_active)
     VALUES (
       '<uuid-dari-auth-users>',
       'Nama Admin',
       'admin@example.com',
       'admin',
       true
     );
     ```

5. **Konfigurasi Environment Variables:**
   Salin file [`.env.local.example`](.env.local.example) menjadi `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
   Lalu isi nilainya dari menu **Project Settings > API** di Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
   > **Penting:** `SUPABASE_SERVICE_ROLE_KEY` memiliki akses penuh yang melewati RLS. Jangan pernah mempublikasikan atau meng-commit file `.env.local` ke GitHub.

6. **Jalankan server development:**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000` di browser.

   Jika menguji pemindaian kamera lewat HP di jaringan lokal yang sama, jalankan mode HTTPS karena browser mewajibkan secure context (HTTPS/`localhost`) untuk mengakses kamera:
   ```bash
   npm run dev:https
   ```

## Skrip Tersedia

| Perintah | Keterangan |
| :--- | :--- |
| `npm run dev` | Menjalankan server development Next.js |
| `npm run dev:https` | Menjalankan server development dengan `--experimental-https` |
| `npm run build` | Membuat build produksi dan pengecekan tipe TypeScript |
| `npm run start` | Menjalankan aplikasi hasil `npm run build` |
| `npm run lint` | Menjalankan pemeriksaan ESLint (`next lint`) |
| `node --test src/lib/anggota-excel.test.mjs` | Menjalankan unit test import/export Excel anggota |

## Struktur Proyek

```text
├── src/
│   ├── middleware.ts                     # Proteksi rute berbasis sesi & role
│   ├── types/database.ts                 # Definisi tipe tabel & enum Supabase
│   ├── components/
│   │   ├── admin-sidebar.tsx             # Navigasi sidebar dashboard admin
│   │   ├── logout-button.tsx             # Tombol keluar sistem
│   │   └── ui/                           # Komponen UI dasar
│   ├── lib/
│   │   ├── activity-log.ts               # Pencatat audit log ke Supabase
│   │   ├── anggota-excel.ts              # Validasi, parser, & generator Excel anggota
│   │   ├── anggota-excel.test.mjs        # Unit test helper Excel anggota
│   │   ├── utils.ts                      # Helper class CSS (cn)
│   │   ├── actions/                      # Server Actions (auth, absensi, anggota, inventaris, kegiatan, petugas)
│   │   └── supabase/                     # Supabase server & admin client
│   └── app/
│       ├── login/                        # Halaman login
│       ├── admin/                        # Halaman & komponen dashboard admin
│       └── petugas/                      # Halaman daftar kegiatan & scanner presensi
├── supabase/
│   └── schema.sql                        # DDL tabel, trigger, RLS policies, & index
├── prd_web_kesekretariatan_hima.md       # Product Requirements Document (PRD)
├── .env.local.example                    # Contoh template environment variables
└── .gitignore
```
