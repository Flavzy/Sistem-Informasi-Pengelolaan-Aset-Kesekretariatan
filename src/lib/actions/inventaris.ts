"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordActivityLog } from "@/lib/activity-log";
import type { InventarisKondisi } from "@/types/database";

const inventarisSchema = z.object({
  kode_barang: z.string().min(2, "Kode barang minimal 2 karakter").trim().toUpperCase(),
  nama_barang: z.string().min(2, "Nama barang minimal 2 karakter").trim(),
  kategori: z.string().min(2, "Kategori wajib diisi").trim(),
  jumlah: z.coerce.number().int().min(0, "Jumlah tidak boleh negatif"),
  kondisi: z.enum(["baik", "rusak_ringan", "rusak_berat", "hilang"] as const).default("baik"),
  lokasi_simpan: z.string().optional().nullable(),
  catatan: z.string().optional().nullable(),
});

export type ActionResponse = {
  success?: boolean;
  error?: string;
};

export async function createInventarisAction(formData: FormData): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const rawData = {
      kode_barang: formData.get("kode_barang") as string,
      nama_barang: formData.get("nama_barang") as string,
      kategori: formData.get("kategori") as string,
      jumlah: formData.get("jumlah"),
      kondisi: (formData.get("kondisi") as InventarisKondisi) || "baik",
      lokasi_simpan: (formData.get("lokasi_simpan") as string) || null,
      catatan: (formData.get("catatan") as string) || null,
    };

    const parsed = inventarisSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || "Input tidak valid" };
    }

    const { data, error } = await supabase
      .from("inventaris")
      .insert(parsed.data)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: `Kode barang ${parsed.data.kode_barang} sudah terdaftar.` };
      }
      return { error: error.message };
    }

    await recordActivityLog({
      action: "CREATE",
      entityType: "inventaris",
      entityId: data.id,
      description: `Menambahkan barang inventaris: ${parsed.data.nama_barang} (${parsed.data.kode_barang})`,
      details: parsed.data,
    });

    revalidatePath("/admin/inventaris");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}

export async function updateInventarisAction(formData: FormData): Promise<ActionResponse> {
  try {
    const id = formData.get("id") as string;
    if (!id) return { error: "ID barang tidak valid" };

    const supabase = await createClient();

    const rawData = {
      kode_barang: formData.get("kode_barang") as string,
      nama_barang: formData.get("nama_barang") as string,
      kategori: formData.get("kategori") as string,
      jumlah: formData.get("jumlah"),
      kondisi: (formData.get("kondisi") as InventarisKondisi) || "baik",
      lokasi_simpan: (formData.get("lokasi_simpan") as string) || null,
      catatan: (formData.get("catatan") as string) || null,
    };

    const parsed = inventarisSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || "Input tidak valid" };
    }

    const { error } = await supabase
      .from("inventaris")
      .update(parsed.data)
      .eq("id", id);

    if (error) {
      if (error.code === "23505") {
        return { error: `Kode barang ${parsed.data.kode_barang} sudah digunakan oleh barang lain.` };
      }
      return { error: error.message };
    }

    await recordActivityLog({
      action: "UPDATE",
      entityType: "inventaris",
      entityId: id,
      description: `Memperbarui barang inventaris: ${parsed.data.nama_barang} (${parsed.data.kode_barang})`,
      details: parsed.data,
    });

    revalidatePath("/admin/inventaris");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}

export async function deleteInventarisAction(
  id: string,
  nama_barang: string,
  kode_barang: string
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("inventaris").delete().eq("id", id);

    if (error) {
      return { error: error.message };
    }

    await recordActivityLog({
      action: "DELETE",
      entityType: "inventaris",
      entityId: id,
      description: `Menghapus barang inventaris: ${nama_barang} (${kode_barang})`,
      details: { id, nama_barang, kode_barang },
    });

    revalidatePath("/admin/inventaris");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}
