import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScannerClient } from "./scanner-client";
import type {
  KegiatanRow,
  KegiatanPanitiaRow,
  AbsensiRow,
  AnggotaRow,
} from "@/types/database";

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

  // 2. Ambil jumlah panitia terdaftar & absensi terbaru (10 terakhir)
  const [{ count: panitiaCount }, { data: rawAbsensi }] = await Promise.all([
    supabase
      .from("kegiatan_panitia")
      .select("id", { count: "exact", head: true })
      .eq("kegiatan_id", kegiatanId),
    supabase
      .from("absensi")
      .select("*")
      .eq("kegiatan_id", kegiatanId)
      .order("waktu_absen", { ascending: false })
      .limit(10),
  ]);

  const absensiList = (rawAbsensi as AbsensiRow[]) || [];

  // 3. Ambil data panitia terkait (dan fallback anggota untuk data lama jika ada)
  const panitiaIds = Array.from(
    new Set(absensiList.map((a) => a.panitia_id).filter(Boolean))
  ) as string[];
  const legacyAnggotaIds = Array.from(
    new Set(
      absensiList
        .filter((a) => !a.panitia_id && a.anggota_id)
        .map((a) => a.anggota_id as string)
    )
  );

  let panitiaMap = new Map<string, KegiatanPanitiaRow>();
  if (panitiaIds.length > 0) {
    const { data: panitiaData } = await supabase
      .from("kegiatan_panitia")
      .select("*")
      .in("id", panitiaIds);
    if (panitiaData) {
      panitiaMap = new Map((panitiaData as KegiatanPanitiaRow[]).map((p) => [p.id, p]));
    }
  }

  let legacyAnggotaMap = new Map<string, AnggotaRow>();
  if (legacyAnggotaIds.length > 0) {
    const { data: anggotaData } = await supabase
      .from("anggota")
      .select("*")
      .in("id", legacyAnggotaIds);
    if (anggotaData) {
      legacyAnggotaMap = new Map((anggotaData as AnggotaRow[]).map((a) => [a.id, a]));
    }
  }

  // 4. Format initial attendance (prioritas data panitia kegiatan)
  const initialAttendance = absensiList.map((a) => {
    const pan = a.panitia_id ? panitiaMap.get(a.panitia_id) : null;
    const legacyAng =
      !pan && a.anggota_id ? legacyAnggotaMap.get(a.anggota_id) : null;
    return {
      id: a.id,
      nama_lengkap: pan?.nama_lengkap || legacyAng?.nama_lengkap || "Panitia",
      npm: pan?.npm || legacyAng?.npm || "-",
      jabatan: pan?.jabatan || legacyAng?.jabatan || "-",
      divisi: pan?.divisi || legacyAng?.divisi || "-",
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
      panitiaCount={panitiaCount ?? 0}
      initialAttendance={initialAttendance}
    />
  );
}
