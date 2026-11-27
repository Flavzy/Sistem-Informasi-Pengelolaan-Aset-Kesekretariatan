"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordActivityLog } from "@/lib/activity-log";
import type { AbsensiMetode } from "@/types/database";

const recordAbsensiSchema = z.object({
  kegiatan_id: z.string().uuid("ID Kegiatan tidak valid"),
  npm: z.string().min(3, "NPM minimal 3 karakter").trim(),
  metode: z.enum(["scan", "manual"] as const).default("scan"),
});

export type RecordAbsensiResponse = {
  success?: boolean;
  error?: string;
  isDuplicate?: boolean;
  anggota?: {
    id: string;
    nama_lengkap: string;
    npm: string;
    divisi: string;
  };
};

export async function recordAbsensiAction(
  kegiatan_id: string,
  npm: string,
  metode: AbsensiMetode = "scan"
): Promise<RecordAbsensiResponse> {
  try {
    const parsed = recordAbsensiSchema.safeParse({ kegiatan_id, npm, metode });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || "Input tidak valid" };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Cek apakah kegiatan ada dan sedang berlangsung
    const { data: kegiatan, error: kegiatanError } = await supabase
      .from("kegiatan")
      .select("id, nama_kegiatan, status")
      .eq("id", kegiatan_id)
      .single();

    if (kegiatanError || !kegiatan) {
      return { error: "Kegiatan tidak ditemukan" };
    }

    // 2. Cari anggota berdasarkan NPM
    const { data: anggota, error: anggotaError } = await supabase
      .from("anggota")
      .select("id, nama_lengkap, npm, divisi, status")
      .eq("npm", parsed.data.npm)
      .single();

    if (anggotaError || !anggota) {
      return {
        error: `NPM "${parsed.data.npm}" tidak terdaftar dalam data anggota HIMA.`,
      };
    }

    // 3. Simpan ke tabel absensi
    const { data: absensi, error: insertError } = await supabase
      .from("absensi")
      .insert({
        kegiatan_id,
        anggota_id: anggota.id,
        metode: parsed.data.metode,
        dicatat_oleh: user?.id || null,
      })
      .select("id")
      .single();

    if (insertError) {
      // 23505 adalah PostgreSQL Unique Violation
      if (insertError.code === "23505") {
        return {
          isDuplicate: true,
          error: `${anggota.nama_lengkap} (${anggota.npm}) sudah melakukan presensi sebelumnya.`,
        };
      }
      return { error: insertError.message };
    }

    // 4. Catat ke activity_logs
    await recordActivityLog({
      action: "SCAN_ABSEN",
      entityType: "absensi",
      entityId: absensi.id,
      description: `Presensi [${metode}] ${kegiatan.nama_kegiatan}: ${anggota.nama_lengkap} (${anggota.npm})`,
      details: {
        kegiatan_id,
        nama_kegiatan: kegiatan.nama_kegiatan,
        anggota_id: anggota.id,
        nama_lengkap: anggota.nama_lengkap,
        npm: anggota.npm,
        metode,
      },
    });

    revalidatePath(`/petugas/scan/${kegiatan_id}`);
    revalidatePath(`/admin/kegiatan/${kegiatan_id}`);

    return {
      success: true,
      anggota: {
        id: anggota.id,
        nama_lengkap: anggota.nama_lengkap,
        npm: anggota.npm,
        divisi: anggota.divisi,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}
