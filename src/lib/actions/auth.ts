"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export type LoginState = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  prevState: LoginState | null,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const validation = loginSchema.safeParse({ email, password });
  if (!validation.success) {
    return {
      error: validation.error.errors[0]?.message || "Input tidak valid",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: validation.data.email,
    password: validation.data.password,
  });

  if (error || !data.user) {
    return {
      error: "Email atau password salah.",
    };
  }

  // Periksa profil pengguna dan status aktif
  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      error: "Profil pengguna tidak ditemukan. Hubungi administrator.",
    };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return {
      error: "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.",
    };
  }

  revalidatePath("/", "layout");

  if (profile.role === "admin") {
    redirect("/admin");
  } else {
    redirect("/petugas");
  }
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
