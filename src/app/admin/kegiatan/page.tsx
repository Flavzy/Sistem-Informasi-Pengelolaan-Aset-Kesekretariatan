import { createClient } from "@/lib/supabase/server";
import { KegiatanClient } from "./kegiatan-client";
import type { KegiatanRow } from "@/types/database";

export const metadata = {
  title: "Daftar Kegiatan | Kesekretariatan HIMA",
};

export default async function AdminKegiatanPage() {
  const supabase = await createClient();

  const [{ data: kegiatan, error }, { data: panitiaRows }, { data: absensiRows }] =
    await Promise.all([
      supabase.from("kegiatan").select("*").order("tanggal", { ascending: false }),
      supabase.from("kegiatan_panitia").select("kegiatan_id"),
      supabase.from("absensi").select("kegiatan_id"),
    ]);

  if (error) {
    console.error("Gagal memuat daftar kegiatan:", error.message);
  }

  const panitiaCounts: Record<string, number> = {};
  for (const row of panitiaRows ?? []) {
    panitiaCounts[row.kegiatan_id] = (panitiaCounts[row.kegiatan_id] ?? 0) + 1;
  }

  const absensiCounts: Record<string, number> = {};
  for (const row of absensiRows ?? []) {
    absensiCounts[row.kegiatan_id] = (absensiCounts[row.kegiatan_id] ?? 0) + 1;
  }

  return (
    <KegiatanClient
      initialKegiatan={(kegiatan as KegiatanRow[]) || []}
      panitiaCounts={panitiaCounts}
      absensiCounts={absensiCounts}
    />
  );
}
