import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KegiatanDetailClient, type AttendanceItem } from "./detail-client";
import type { KegiatanRow, AnggotaRow, ProfileRow, AbsensiRow } from "@/types/database";

export const metadata = {
  title: "Detail Kegiatan & Presensi | Kesekretariatan HIMA",
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

  // 2. Ambil absensi
  const { data: absensiList } = await supabase
    .from("absensi")
    .select("*")
    .eq("kegiatan_id", id)
    .order("waktu_absen", { ascending: false });

  const rawAbsensi = (absensiList as AbsensiRow[]) || [];

  // 3. Ambil data anggota terkait
  const anggotaIds = Array.from(new Set(rawAbsensi.map((a) => a.anggota_id)));
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

  // 4. Ambil profil petugas pencatat
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

  // 5. Satukan data
  const attendanceItems: AttendanceItem[] = rawAbsensi.map((absen) => {
    const ang = anggotaMap.get(absen.anggota_id);
    const pet = absen.dicatat_oleh ? profilesMap.get(absen.dicatat_oleh) : null;
    return {
      id: absen.id,
      waktu_absen: absen.waktu_absen,
      metode: absen.metode,
      anggota: {
        nama_lengkap: ang?.nama_lengkap || "Anggota (Tidak ditemukan)",
        npm: ang?.npm || "-",
        divisi: ang?.divisi || "-",
      },
      dicatat_oleh_nama: pet?.nama_lengkap || "Sistem / Petugas",
    };
  });

  return (
    <KegiatanDetailClient
      kegiatan={kegiatan as KegiatanRow}
      attendance={attendanceItems}
    />
  );
}
