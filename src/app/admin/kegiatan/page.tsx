import { createClient } from "@/lib/supabase/server";
import { KegiatanClient } from "./kegiatan-client";
import type { KegiatanRow } from "@/types/database";

export const metadata = {
  title: "Daftar Kegiatan | Kesekretariatan HIMA",
};

export default async function AdminKegiatanPage() {
  const supabase = await createClient();

  const { data: kegiatan, error } = await supabase
    .from("kegiatan")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    console.error("Gagal memuat daftar kegiatan:", error.message);
  }

  return <KegiatanClient initialKegiatan={(kegiatan as KegiatanRow[]) || []} />;
}
