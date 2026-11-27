import { createClient } from "@/lib/supabase/server";
import { PetugasClient } from "./petugas-client";
import type { ProfileRow } from "@/types/database";

export const metadata = {
  title: "Kelola Petugas | Kesekretariatan HIMA",
};

export default async function AdminPetugasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat profiles:", error.message);
  }

  return (
    <PetugasClient
      initialProfiles={(profiles as ProfileRow[]) || []}
      currentUserId={user?.id || ""}
    />
  );
}
