"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordActivityLog } from "@/lib/activity-log";
import { anggotaSchema, type AnggotaImportInput } from "@/lib/anggota-excel";

export type ActionResponse = {
  success?: boolean;
  error?: string;
};

export type ImportAnggotaResponse = ActionResponse & {
  total?: number;
  createdCount?: number;
  updatedCount?: number;
};

function parseAnggotaFormData(formData: FormData) {
  return anggotaSchema.safeParse({
    npm: formData.get("npm") as string,
    nama_lengkap: formData.get("nama_lengkap") as string,
    angkatan: formData.get("angkatan") as string,
    divisi: formData.get("divisi") as string,
    jabatan: (formData.get("jabatan") as string) || null,
    no_hp: (formData.get("no_hp") as string) || null,
    status: (formData.get("status") as string) || "aktif",
  });
}

export async function createAnggotaAction(formData: FormData): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const parsed = parseAnggotaFormData(formData);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || "Input tidak valid" };
    }

    const { data, error } = await supabase
      .from("anggota")
      .insert(parsed.data)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: `NPM ${parsed.data.npm} sudah terdaftar.` };
      }
      return { error: error.message };
    }

    await recordActivityLog({
      action: "CREATE",
      entityType: "anggota",
      entityId: data.id,
      description: `Menambahkan anggota: ${parsed.data.nama_lengkap} (${parsed.data.npm})`,
      details: parsed.data,
    });

    revalidatePath("/admin/anggota");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}

export async function updateAnggotaAction(formData: FormData): Promise<ActionResponse> {
  try {
    const id = formData.get("id") as string;
    if (!id) return { error: "ID Anggota tidak valid" };

    const supabase = await createClient();
    const parsed = parseAnggotaFormData(formData);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || "Input tidak valid" };
    }

    const { error } = await supabase
      .from("anggota")
      .update(parsed.data)
      .eq("id", id);

    if (error) {
      if (error.code === "23505") {
        return { error: `NPM ${parsed.data.npm} sudah digunakan oleh anggota lain.` };
      }
      return { error: error.message };
    }

    await recordActivityLog({
      action: "UPDATE",
      entityType: "anggota",
      entityId: id,
      description: `Memperbarui data anggota: ${parsed.data.nama_lengkap} (${parsed.data.npm})`,
      details: parsed.data,
    });

    revalidatePath("/admin/anggota");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}

export async function deleteAnggotaAction(
  id: string,
  nama_lengkap: string,
  npm: string
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("anggota").delete().eq("id", id);

    if (error) {
      return { error: error.message };
    }

    await recordActivityLog({
      action: "DELETE",
      entityType: "anggota",
      entityId: id,
      description: `Menghapus anggota: ${nama_lengkap} (${npm})`,
      details: { id, nama_lengkap, npm },
    });

    revalidatePath("/admin/anggota");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}

const importBatchSchema = z
  .array(anggotaSchema)
  .min(1, "Data import tidak boleh kosong")
  .max(1000, "Maksimal 1000 baris per proses import");

export async function importAnggotaAction(
  rows: AnggotaImportInput[]
): Promise<ImportAnggotaResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized: Silakan login terlebih dahulu." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin" || !profile.is_active) {
      return { error: "Forbidden: Hanya administrator aktif yang dapat mengimpor data." };
    }

    const parsed = importBatchSchema.safeParse(rows);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || "Format data import tidak valid." };
    }

    // Tolak duplikat NPM dalam batch agar upsert PostgreSQL tidak gagal
    const seenNpms = new Set<string>();
    for (const item of parsed.data) {
      if (seenNpms.has(item.npm)) {
        return { error: `NPM ${item.npm} muncul lebih dari satu kali dalam file import.` };
      }
      seenNpms.add(item.npm);
    }

    const npms = Array.from(seenNpms);
    const { data: existingRows, error: fetchError } = await supabase
      .from("anggota")
      .select("npm")
      .in("npm", npms);

    if (fetchError) {
      return { error: fetchError.message };
    }

    const updatedCount = existingRows?.length ?? 0;
    const createdCount = parsed.data.length - updatedCount;

    const { error: upsertError } = await supabase
      .from("anggota")
      .upsert(parsed.data, { onConflict: "npm" });

    if (upsertError) {
      return { error: upsertError.message };
    }

    await recordActivityLog({
      action: "CREATE",
      entityType: "anggota",
      description: `Import Excel anggota: ${createdCount} baru, ${updatedCount} diperbarui`,
      details: {
        total: parsed.data.length,
        createdCount,
        updatedCount,
        sampleNpms: npms.slice(0, 10),
      },
      actorId: user.id,
      actorRole: profile.role,
    });

    revalidatePath("/admin/anggota");
    return {
      success: true,
      total: parsed.data.length,
      createdCount,
      updatedCount,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan saat mengimpor data";
    return { error: message };
  }
}
