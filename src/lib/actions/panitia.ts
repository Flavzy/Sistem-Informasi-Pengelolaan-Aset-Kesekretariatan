"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordActivityLog } from "@/lib/activity-log";
import { panitiaSchema, type PanitiaImportInput } from "@/lib/panitia-excel";

export type PanitiaActionResponse = {
  success?: boolean;
  error?: string;
};

export type ImportPanitiaResponse = PanitiaActionResponse & {
  total?: number;
  createdCount?: number;
  updatedCount?: number;
};

const importPanitiaBatchSchema = z
  .array(panitiaSchema)
  .min(1, "Data panitia tidak boleh kosong")
  .max(1000, "Maksimal 1000 baris panitia per proses import");

async function requireActiveAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized: Silakan login terlebih dahulu." as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return { error: "Forbidden: Hanya administrator aktif yang dapat mengelola panitia." as const };
  }

  return { supabase, user, profile };
}

function revalidateKegiatanPaths(kegiatanId: string) {
  revalidatePath("/admin/kegiatan");
  revalidatePath(`/admin/kegiatan/${kegiatanId}`);
  revalidatePath("/petugas");
  revalidatePath(`/petugas/scan/${kegiatanId}`);
}

export async function importPanitiaAction(
  kegiatanId: string,
  rows: PanitiaImportInput[]
): Promise<ImportPanitiaResponse> {
  try {
    const idCheck = z.string().uuid("ID Kegiatan tidak valid").safeParse(kegiatanId);
    if (!idCheck.success) {
      return { error: idCheck.error.errors[0]?.message || "ID Kegiatan tidak valid." };
    }

    const auth = await requireActiveAdmin();
    if ("error" in auth) {
      return { error: auth.error };
    }

    const { supabase, user, profile } = auth;

    const { data: kegiatan, error: kegiatanError } = await supabase
      .from("kegiatan")
      .select("id, nama_kegiatan")
      .eq("id", kegiatanId)
      .single();

    if (kegiatanError || !kegiatan) {
      return { error: "Kegiatan tidak ditemukan." };
    }

    const parsed = importPanitiaBatchSchema.safeParse(rows);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || "Format data panitia tidak valid." };
    }

    const seenNpms = new Set<string>();
    for (const item of parsed.data) {
      if (seenNpms.has(item.npm)) {
        return { error: `NPM ${item.npm} muncul lebih dari satu kali dalam file import.` };
      }
      seenNpms.add(item.npm);
    }

    const npms = Array.from(seenNpms);

    const [{ data: existingPanitia, error: fetchError }, { data: matchedAnggota }] =
      await Promise.all([
        supabase
          .from("kegiatan_panitia")
          .select("npm")
          .eq("kegiatan_id", kegiatanId)
          .in("npm", npms),
        supabase.from("anggota").select("id, npm").in("npm", npms),
      ]);

    if (fetchError) {
      return { error: fetchError.message };
    }

    const anggotaIdByNpm = new Map(
      (matchedAnggota ?? []).map((a) => [a.npm, a.id])
    );

    const payload = parsed.data.map((item) => ({
      kegiatan_id: kegiatanId,
      anggota_id: anggotaIdByNpm.get(item.npm) ?? null,
      npm: item.npm,
      nama_lengkap: item.nama_lengkap,
      jabatan: item.jabatan,
      divisi: item.divisi,
    }));

    const updatedCount = existingPanitia?.length ?? 0;
    const createdCount = payload.length - updatedCount;

    const { error: upsertError } = await supabase
      .from("kegiatan_panitia")
      .upsert(payload, { onConflict: "kegiatan_id,npm" });

    if (upsertError) {
      return { error: upsertError.message };
    }

    await recordActivityLog({
      action: "CREATE",
      entityType: "panitia",
      entityId: kegiatanId,
      description: `Import Excel panitia ${kegiatan.nama_kegiatan}: ${createdCount} baru, ${updatedCount} diperbarui`,
      details: {
        kegiatan_id: kegiatanId,
        nama_kegiatan: kegiatan.nama_kegiatan,
        total: payload.length,
        createdCount,
        updatedCount,
        sampleNpms: npms.slice(0, 10),
      },
      actorId: user.id,
      actorRole: profile.role,
    });

    revalidateKegiatanPaths(kegiatanId);
    return {
      success: true,
      total: payload.length,
      createdCount,
      updatedCount,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan saat mengimpor panitia";
    return { error: message };
  }
}

export async function deletePanitiaAction(
  panitiaId: string,
  kegiatanId: string,
  nama_lengkap: string,
  npm: string
): Promise<PanitiaActionResponse> {
  try {
    const auth = await requireActiveAdmin();
    if ("error" in auth) {
      return { error: auth.error };
    }

    const { supabase, user, profile } = auth;
    const { error } = await supabase
      .from("kegiatan_panitia")
      .delete()
      .eq("id", panitiaId)
      .eq("kegiatan_id", kegiatanId);

    if (error) {
      return { error: error.message };
    }

    await recordActivityLog({
      action: "DELETE",
      entityType: "panitia",
      entityId: panitiaId,
      description: `Menghapus panitia kegiatan: ${nama_lengkap} (${npm})`,
      details: { panitia_id: panitiaId, kegiatan_id: kegiatanId, nama_lengkap, npm },
      actorId: user.id,
      actorRole: profile.role,
    });

    revalidateKegiatanPaths(kegiatanId);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}

export async function clearPanitiaKegiatanAction(
  kegiatanId: string,
  nama_kegiatan: string
): Promise<PanitiaActionResponse> {
  try {
    const auth = await requireActiveAdmin();
    if ("error" in auth) {
      return { error: auth.error };
    }

    const { supabase, user, profile } = auth;
    const { error } = await supabase
      .from("kegiatan_panitia")
      .delete()
      .eq("kegiatan_id", kegiatanId);

    if (error) {
      return { error: error.message };
    }

    await recordActivityLog({
      action: "DELETE",
      entityType: "panitia",
      entityId: kegiatanId,
      description: `Mengosongkan daftar panitia kegiatan: ${nama_kegiatan}`,
      details: { kegiatan_id: kegiatanId, nama_kegiatan },
      actorId: user.id,
      actorRole: profile.role,
    });

    revalidateKegiatanPaths(kegiatanId);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}
