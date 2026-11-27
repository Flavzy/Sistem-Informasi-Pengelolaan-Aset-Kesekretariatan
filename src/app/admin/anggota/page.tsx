import { createClient } from "@/lib/supabase/server";
import { AnggotaClient } from "./anggota-client";
import type { AnggotaRow } from "@/types/database";

export const metadata = {
  title: "Data Anggota | Kesekretariatan HIMA",
};

export default async function AdminAnggotaPage() {
  const supabase = await createClient();

  const { data: anggota, error } = await supabase
    .from("anggota")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat data anggota:", error.message);
  }

  return <AnggotaClient initialAnggota={(anggota as AnggotaRow[]) || []} />;
}
