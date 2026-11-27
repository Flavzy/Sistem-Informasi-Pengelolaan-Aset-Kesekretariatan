import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScannerClient } from "./scanner-client";
import type { KegiatanRow, AbsensiRow, AnggotaRow } from "@/types/database";

export const metadata = {
  title: "Scanner Presensi Barcode | Petugas HIMA",
};

export default async function ScannerPage({
  params,
}: {
  params: Promise<{ kegiatanId: string }>;
}) {
  const { kegiatanId } = await params;
  const supabase = await createClient();

  // 1. Ambil data kegiatan
  const { data: kegiatan, error } = await supabase
    .from("kegiatan")
    .select("*")
    .eq("id", kegiatanId)
    .single();

  if (error || !kegiatan) {
    notFound();
  }

  // 2. Ambil absensi terbaru (10 terakhir)
  const { data: rawAbsensi } = await supabase
    .from("absensi")
    .select("*")
    .eq("kegiatan_id", kegiatanId)
    .order("waktu_absen", { ascending: false })
    .limit(10);

  const absensiList = (rawAbsensi as AbsensiRow[]) || [];

  // 3. Ambil data anggota terkait
  const anggotaIds = absensiList.map((a) => a.anggota_id);
  let anggotaMap = new Map<string, AnggotaRow>();
  if (anggotaIds.length > 0) {
    const { data: anggotaData } = await supabase
      .from("anggota")
      .select("*")
      .in("id", anggotaIds);
    if (anggotaData) {
      anggotaMap = new Map((anggotaData as AnggotaRow[]).map((a) => [a.id, a]));
    }
  }

  // 4. Format initial attendance
  const initialAttendance = absensiList.map((a) => {
    const ang = anggotaMap.get(a.anggota_id);
    return {
      id: a.id,
      nama_lengkap: ang?.nama_lengkap || "Anggota",
      npm: ang?.npm || "-",
      divisi: ang?.divisi || "-",
      waktu: new Date(a.waktu_absen).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      metode: a.metode,
    };
  });

  return (
    <ScannerClient
      kegiatan={kegiatan as KegiatanRow}
      initialAttendance={initialAttendance}
    />
  );
}
