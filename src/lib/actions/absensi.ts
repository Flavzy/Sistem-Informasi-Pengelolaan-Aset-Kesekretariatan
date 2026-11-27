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
  panitia?: {
    id: string;
    nama_lengkap: string;
    npm: string;
    jabatan: string;
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

    // 1. Cek apakah kegiatan ada
    const { data: kegiatan, error: kegiatanError } = await supabase
      .from("kegiatan")
      .select("id, nama_kegiatan, status")
      .eq("id", kegiatan_id)
      .single();

    if (kegiatanError || !kegiatan) {
      return { error: "Kegiatan tidak ditemukan" };
    }

    // 2. Cari data panitia pada kegiatan berdasarkan NPM (wajib terdaftar di kegiatan_panitia)
    const { data: panitia } = await supabase
      .from("kegiatan_panitia")
      .select("id, anggota_id, nama_lengkap, npm, jabatan, divisi")
      .eq("kegiatan_id", kegiatan_id)
      .eq("npm", parsed.data.npm)
      .maybeSingle();

    if (!panitia) {
      const { count: panitiaCount } = await supabase
        .from("kegiatan_panitia")
        .select("id", { count: "exact", head: true })
        .eq("kegiatan_id", kegiatan_id);

      if (!panitiaCount) {
        return {
          error: `Daftar panitia untuk kegiatan "${kegiatan.nama_kegiatan}" masih kosong. Admin wajib mengimpor data panitia terlebih dahulu.`,
        };
      }

      return {
        error: `NPM "${parsed.data.npm}" tidak terdaftar sebagai panitia pada kegiatan "${kegiatan.nama_kegiatan}".`,
      };
    }

    // 3. Simpan ke tabel absensi dengan referensi panitia_id
    const { data: absensi, error: insertError } = await supabase
      .from("absensi")
      .insert({
        kegiatan_id,
        panitia_id: panitia.id,
        anggota_id: panitia.anggota_id ?? null,
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
          error: `${panitia.nama_lengkap} (${panitia.npm}) sudah melakukan presensi sebelumnya.`,
        };
      }
      return { error: insertError.message };
    }

    // 4. Catat ke activity_logs
    await recordActivityLog({
      action: "SCAN_ABSEN",
      entityType: "absensi",
      entityId: absensi.id,
      description: `Presensi [${metode}] ${kegiatan.nama_kegiatan}: ${panitia.nama_lengkap} (${panitia.npm}) - ${panitia.jabatan} (${panitia.divisi})`,
      details: {
        kegiatan_id,
        nama_kegiatan: kegiatan.nama_kegiatan,
        panitia_id: panitia.id,
        anggota_id: panitia.anggota_id,
        nama_lengkap: panitia.nama_lengkap,
        npm: panitia.npm,
        jabatan: panitia.jabatan,
        divisi: panitia.divisi,
        metode,
      },
    });

    revalidatePath("/petugas");
    revalidatePath(`/petugas/scan/${kegiatan_id}`);
    revalidatePath("/admin/kegiatan");
    revalidatePath(`/admin/kegiatan/${kegiatan_id}`);

    return {
      success: true,
      panitia: {
        id: panitia.id,
        nama_lengkap: panitia.nama_lengkap,
        npm: panitia.npm,
        jabatan: panitia.jabatan,
        divisi: panitia.divisi,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}
