"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordActivityLog } from "@/lib/activity-log";
import type { UserRole } from "@/types/database";

const createPetugasSchema = z.object({
  nama_lengkap: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["admin", "petugas"] as const).default("petugas"),
});

const updatePetugasSchema = z.object({
  id: z.string().uuid("ID tidak valid"),
  nama_lengkap: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  role: z.enum(["admin", "petugas"] as const),
});

export type ActionResponse = {
  success?: boolean;
  error?: string;
};

// Helper internal untuk memverifikasi session admin pemanggil
async function verifyAdminCaller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized: Silakan login terlebih dahulu");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nama_lengkap, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    throw new Error("Forbidden: Hanya administrator aktif yang diizinkan");
  }

  return { user, profile };
}

export async function createPetugasAction(
  formData: FormData
): Promise<ActionResponse> {
  try {
    const caller = await verifyAdminCaller();

    const rawData = {
      nama_lengkap: formData.get("nama_lengkap") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      role: (formData.get("role") as UserRole) || "petugas",
    };

    const parsed = createPetugasSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || "Input tidak valid" };
    }

    const { nama_lengkap, email, password, role } = parsed.data;
    const adminClient = createAdminClient();

    // 1. Buat user di Supabase Auth
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nama_lengkap },
      });

    if (authError || !authData.user) {
      return {
        error: authError?.message || "Gagal membuat akun di Supabase Auth",
      };
    }

    const newUserId = authData.user.id;

    // 2. Simpan profil ke tabel profiles
    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: newUserId,
      nama_lengkap,
      email,
      role,
      is_active: true,
    });

    if (profileError) {
      // Rollback auth user jika insert profile gagal
      await adminClient.auth.admin.deleteUser(newUserId);
      return { error: `Gagal menyimpan profil: ${profileError.message}` };
    }

    // 3. Catat ke activity_logs
    await recordActivityLog({
      action: "CREATE",
      entityType: "profiles",
      entityId: newUserId,
      description: `Membuat akun ${role}: ${nama_lengkap} (${email})`,
      details: { email, nama_lengkap, role },
      actorId: caller.profile.id,
      actorRole: "admin",
    });

    revalidatePath("/admin/petugas");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}

export async function updatePetugasAction(
  formData: FormData
): Promise<ActionResponse> {
  try {
    const caller = await verifyAdminCaller();

    const rawData = {
      id: formData.get("id") as string,
      nama_lengkap: formData.get("nama_lengkap") as string,
      role: formData.get("role") as UserRole,
    };

    const parsed = updatePetugasSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || "Input tidak valid" };
    }

    const { id, nama_lengkap, role } = parsed.data;
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("profiles")
      .update({ nama_lengkap, role })
      .eq("id", id);

    if (error) {
      return { error: error.message };
    }

    // Catat log aktivitas
    await recordActivityLog({
      action: "UPDATE",
      entityType: "profiles",
      entityId: id,
      description: `Memperbarui data akun ${nama_lengkap} (role: ${role})`,
      details: { nama_lengkap, role },
      actorId: caller.profile.id,
      actorRole: "admin",
    });

    revalidatePath("/admin/petugas");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}

export async function togglePetugasStatusAction(
  id: string,
  currentStatus: boolean,
  nama_lengkap: string
): Promise<ActionResponse> {
  try {
    const caller = await verifyAdminCaller();

    if (id === caller.profile.id) {
      return { error: "Anda tidak dapat menonaktifkan akun Anda sendiri" };
    }

    const newStatus = !currentStatus;
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("profiles")
      .update({ is_active: newStatus })
      .eq("id", id);

    if (error) {
      return { error: error.message };
    }

    // Catat log aktivitas
    await recordActivityLog({
      action: "TOGGLE_PETUGAS",
      entityType: "profiles",
      entityId: id,
      description: `${
        newStatus ? "Mengaktifkan" : "Menonaktifkan"
      } akun ${nama_lengkap}`,
      details: { is_active: newStatus },
      actorId: caller.profile.id,
      actorRole: "admin",
    });

    revalidatePath("/admin/petugas");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return { error: message };
  }
}
