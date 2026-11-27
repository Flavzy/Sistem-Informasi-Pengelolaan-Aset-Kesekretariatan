/**
 * src/types/database.ts
 * Type definitions untuk Supabase Database.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enum Types ──────────────────────────────────────────────────────────────

export type UserRole = "admin" | "petugas";
export type AnggotaStatus = "aktif" | "nonaktif";
export type InventarisKondisi =
  | "baik"
  | "rusak_ringan"
  | "rusak_berat"
  | "hilang";
export type KegiatanStatus = "terjadwal" | "berlangsung" | "selesai";
export type AbsensiMetode = "scan" | "manual";
export type ActivityLogAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "SCAN_ABSEN"
  | "TOGGLE_PETUGAS";
export type EntityType =
  | "anggota"
  | "inventaris"
  | "kegiatan"
  | "panitia"
  | "absensi"
  | "profiles";

// ─── Row Types ───────────────────────────────────────────────────────────────

export type ProfileRow = {
  id: string;
  nama_lengkap: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

export type AnggotaRow = {
  id: string;
  npm: string;
  nama_lengkap: string;
  angkatan: string;
  divisi: string;
  jabatan: string | null;
  no_hp: string | null;
  status: AnggotaStatus;
  created_at: string;
  updated_at: string;
};

export type InventarisRow = {
  id: string;
  kode_barang: string;
  nama_barang: string;
  kategori: string;
  jumlah: number;
  kondisi: InventarisKondisi;
  lokasi_simpan: string | null;
  catatan: string | null;
  created_at: string;
  updated_at: string;
};

export type KegiatanRow = {
  id: string;
  nama_kegiatan: string;
  deskripsi: string | null;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string | null;
  lokasi: string;
  status: KegiatanStatus;
  created_by: string | null;
  created_at: string;
};

export type KegiatanPanitiaRow = {
  id: string;
  kegiatan_id: string;
  anggota_id: string | null;
  npm: string;
  nama_lengkap: string;
  jabatan: string;
  divisi: string;
  created_at: string;
  updated_at: string;
};

export type AbsensiRow = {
  id: string;
  kegiatan_id: string;
  panitia_id: string | null;
  anggota_id: string | null;
  waktu_absen: string;
  metode: AbsensiMetode;
  dicatat_oleh: string | null;
};

export type ActivityLogRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: ActivityLogAction;
  entity_type: EntityType;
  entity_id: string | null;
  description: string;
  details: Json | null;
  created_at: string;
};

// ─── Database Type untuk Supabase Client ─────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          nama_lengkap: string;
          email: string;
          role: UserRole;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nama_lengkap?: string;
          email?: string;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      anggota: {
        Row: AnggotaRow;
        Insert: {
          id?: string;
          npm: string;
          nama_lengkap: string;
          angkatan: string;
          divisi: string;
          jabatan?: string | null;
          no_hp?: string | null;
          status?: AnggotaStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          npm?: string;
          nama_lengkap?: string;
          angkatan?: string;
          divisi?: string;
          jabatan?: string | null;
          no_hp?: string | null;
          status?: AnggotaStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventaris: {
        Row: InventarisRow;
        Insert: {
          id?: string;
          kode_barang: string;
          nama_barang: string;
          kategori: string;
          jumlah?: number;
          kondisi?: InventarisKondisi;
          lokasi_simpan?: string | null;
          catatan?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kode_barang?: string;
          nama_barang?: string;
          kategori?: string;
          jumlah?: number;
          kondisi?: InventarisKondisi;
          lokasi_simpan?: string | null;
          catatan?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      kegiatan: {
        Row: KegiatanRow;
        Insert: {
          id?: string;
          nama_kegiatan: string;
          deskripsi?: string | null;
          tanggal: string;
          waktu_mulai: string;
          waktu_selesai?: string | null;
          lokasi: string;
          status?: KegiatanStatus;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nama_kegiatan?: string;
          deskripsi?: string | null;
          tanggal?: string;
          waktu_mulai?: string;
          waktu_selesai?: string | null;
          lokasi?: string;
          status?: KegiatanStatus;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      kegiatan_panitia: {
        Row: KegiatanPanitiaRow;
        Insert: {
          id?: string;
          kegiatan_id: string;
          anggota_id?: string | null;
          npm: string;
          nama_lengkap: string;
          jabatan: string;
          divisi: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kegiatan_id?: string;
          anggota_id?: string | null;
          npm?: string;
          nama_lengkap?: string;
          jabatan?: string;
          divisi?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      absensi: {
        Row: AbsensiRow;
        Insert: {
          id?: string;
          kegiatan_id: string;
          panitia_id?: string | null;
          anggota_id?: string | null;
          waktu_absen?: string;
          metode?: AbsensiMetode;
          dicatat_oleh?: string | null;
        };
        Update: {
          id?: string;
          kegiatan_id?: string;
          panitia_id?: string | null;
          anggota_id?: string | null;
          waktu_absen?: string;
          metode?: AbsensiMetode;
          dicatat_oleh?: string | null;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: ActivityLogRow;
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          action: ActivityLogAction;
          entity_type: EntityType;
          entity_id?: string | null;
          description: string;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          action?: ActivityLogAction;
          entity_type?: EntityType;
          entity_id?: string | null;
          description?: string;
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, unknown>;
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
