"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordActivityLog } from "@/lib/activity-log";
import type { KegiatanStatus } from "@/types/database";

const kegiatanSchema = z.object({
  nama_kegiatan: z.string().min(2, "Nama kegiatan minimal 2 karakter").trim(),
  deskripsi: z.string().optional().nullable(),
  tanggal: z.string().min(10, "Tanggal tidak valid"),
  waktu_mulai: z.string().min(4, "Waktu mulai tidak valid"),
  waktu_selesai: z.string().optional().nullable(),
  lokasi: z.string().min(2, "Lokasi minimal 2 karakter").trim(),
  status: z.enum(["terjadwal", "berlangsung", "selesai"] as const).default("terjadwal"),
});

export type ActionResponse = {
  success?: boolean;
  error?: string;
};

export async function createKegiatanAction(formData: FormData): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const rawData = {
      nama_kegiatan: formData.get("nama_kegiatan") as string,
      deskripsi: (formData.get("deskripsi") as string) || null,
      tanggal: formData.get("tanggal") as string,
      waktu_mulai: formData.get("waktu_mulai") as string,
      waktu_selesai: (formData.get("waktu_selesai") as string) || null,
      lokasi: formData.get("lokasi") as string,
      status: (formData.get("status") as KegiatanStatus) || "terjadwal",
    };

    const parsed = kegiatanSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || "Input tidak valid" };
    }

    const { data, error } = await supabase
      .from("kegiatan")
      .insert({
        ...parsed.data,
        created_by: user?.id || null,
      })
      .select("id")
      .single();

    if (error) {
      return { error: error.message };
    }

    await recordActivityLog({
      action: "CREATE",
      entityType: "kegiatan",
      entityId: data.id,
      description: `Membuat kegiatan: ${parsed.data.nama_kegiatan}`,
      details: parsed.data,
    });

    revalidatePath("/admin/kegiatan");
    revalidatePath("/petugas");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}

export async function updateKegiatanAction(formData: FormData): Promise<ActionResponse> {
  try {
    const id = formData.get("id") as string;
    if (!id) return { error: "ID kegiatan tidak valid" };

    const supabase = await createClient();

    const rawData = {
      nama_kegiatan: formData.get("nama_kegiatan") as string,
      deskripsi: (formData.get("deskripsi") as string) || null,
      tanggal: formData.get("tanggal") as string,
      waktu_mulai: formData.get("waktu_mulai") as string,
      waktu_selesai: (formData.get("waktu_selesai") as string) || null,
      lokasi: formData.get("lokasi") as string,
      status: (formData.get("status") as KegiatanStatus) || "terjadwal",
    };

    const parsed = kegiatanSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || "Input tidak valid" };
    }

    const { error } = await supabase
      .from("kegiatan")
      .update(parsed.data)
      .eq("id", id);

    if (error) {
      return { error: error.message };
    }

    await recordActivityLog({
      action: "UPDATE",
      entityType: "kegiatan",
      entityId: id,
      description: `Memperbarui kegiatan: ${parsed.data.nama_kegiatan}`,
      details: parsed.data,
    });

    revalidatePath("/admin/kegiatan");
    revalidatePath(`/admin/kegiatan/${id}`);
    revalidatePath("/petugas");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}

export async function updateKegiatanStatusAction(
  id: string,
  newStatus: KegiatanStatus,
  nama_kegiatan: string
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("kegiatan")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      return { error: error.message };
    }

    await recordActivityLog({
      action: "UPDATE",
      entityType: "kegiatan",
      entityId: id,
      description: `Mengubah status kegiatan ${nama_kegiatan} menjadi ${newStatus}`,
      details: { status: newStatus },
    });

    revalidatePath("/admin/kegiatan");
    revalidatePath(`/admin/kegiatan/${id}`);
    revalidatePath("/petugas");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}

export async function deleteKegiatanAction(
  id: string,
  nama_kegiatan: string
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("kegiatan").delete().eq("id", id);

    if (error) {
      return { error: error.message };
    }

    await recordActivityLog({
      action: "DELETE",
      entityType: "kegiatan",
      entityId: id,
      description: `Menghapus kegiatan: ${nama_kegiatan}`,
      details: { id, nama_kegiatan },
    });

    revalidatePath("/admin/kegiatan");
    revalidatePath("/petugas");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}
