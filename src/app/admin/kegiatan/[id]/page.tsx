import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KegiatanDetailClient, type AttendanceItem } from "./detail-client";
import type {
  KegiatanRow,
  KegiatanPanitiaRow,
  AnggotaRow,
  ProfileRow,
  AbsensiRow,
} from "@/types/database";

export const metadata = {
  title: "Detail Kegiatan & Panitia | Kesekretariatan HIMA",
};

export default async function KegiatanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Ambil data kegiatan
  const { data: kegiatan, error: kegiatanError } = await supabase
    .from("kegiatan")
    .select("*")
    .eq("id", id)
    .single();

  if (kegiatanError || !kegiatan) {
    notFound();
  }

  // 2. Ambil daftar panitia dan absensi secara paralel
  const [{ data: panitiaData }, { data: absensiList }] = await Promise.all([
    supabase
      .from("kegiatan_panitia")
      .select("*")
      .eq("kegiatan_id", id)
      .order("divisi", { ascending: true })
      .order("jabatan", { ascending: true })
      .order("nama_lengkap", { ascending: true }),
    supabase
      .from("absensi")
      .select("*")
      .eq("kegiatan_id", id)
      .order("waktu_absen", { ascending: false }),
  ]);

  const panitiaList = (panitiaData as KegiatanPanitiaRow[]) || [];
  const rawAbsensi = (absensiList as AbsensiRow[]) || [];

  const panitiaById = new Map(panitiaList.map((p) => [p.id, p]));

  // Fallback untuk data absensi lama (jika ada baris tanpa panitia_id)
  const legacyAnggotaIds = Array.from(
    new Set(
      rawAbsensi
        .filter((a) => !a.panitia_id && a.anggota_id)
        .map((a) => a.anggota_id as string)
    )
  );
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

  // 3. Ambil profil petugas pencatat
  const petugasIds = Array.from(
    new Set(rawAbsensi.map((a) => a.dicatat_oleh).filter(Boolean))
  ) as string[];
  let profilesMap = new Map<string, ProfileRow>();
  if (petugasIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .in("id", petugasIds);
    if (profilesData) {
      profilesMap = new Map((profilesData as ProfileRow[]).map((p) => [p.id, p]));
    }
  }

  // 4. Satukan data kehadiran (prioritas dari data panitia kegiatan)
  const attendanceItems: AttendanceItem[] = rawAbsensi.map((absen) => {
    const pan = absen.panitia_id ? panitiaById.get(absen.panitia_id) : null;
    const legacyAng =
      !pan && absen.anggota_id ? legacyAnggotaMap.get(absen.anggota_id) : null;
    const pet = absen.dicatat_oleh ? profilesMap.get(absen.dicatat_oleh) : null;

    return {
      id: absen.id,
      panitia_id: absen.panitia_id,
      waktu_absen: absen.waktu_absen,
      metode: absen.metode,
      panitia: {
        nama_lengkap:
          pan?.nama_lengkap || legacyAng?.nama_lengkap || "Panitia (Tidak ditemukan)",
        npm: pan?.npm || legacyAng?.npm || "-",
        jabatan: pan?.jabatan || legacyAng?.jabatan || "-",
        divisi: pan?.divisi || legacyAng?.divisi || "-",
      },
      dicatat_oleh_nama: pet?.nama_lengkap || "Sistem / Petugas",
    };
  });

  return (
    <KegiatanDetailClient
      kegiatan={kegiatan as KegiatanRow}
      panitiaList={panitiaList}
      attendance={attendanceItems}
    />
  );
}
