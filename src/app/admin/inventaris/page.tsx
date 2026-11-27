import { createClient } from "@/lib/supabase/server";
import { InventarisClient } from "./inventaris-client";
import type { InventarisRow } from "@/types/database";

export const metadata = {
  title: "Inventaris Barang | Kesekretariatan HIMA",
};

export default async function AdminInventarisPage() {
  const supabase = await createClient();

  const { data: inventaris, error } = await supabase
    .from("inventaris")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat inventaris:", error.message);
  }

  return <InventarisClient initialInventaris={(inventaris as InventarisRow[]) || []} />;
}
