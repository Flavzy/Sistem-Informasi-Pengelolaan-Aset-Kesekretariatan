import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Calendar, Clock, MapPin, Radio, CalendarClock, Users } from "lucide-react";
import type { KegiatanRow } from "@/types/database";

export const metadata = {
  title: "Pilih Kegiatan | Petugas Presensi",
};

export default async function PetugasHomePage() {
  const supabase = await createClient();

  // Ambil kegiatan yang sedang berlangsung & terjadwal
  const [{ data: activeKegiatan }, { data: upcomingKegiatan }] = await Promise.all([
    supabase
      .from("kegiatan")
      .select("*")
      .eq("status", "berlangsung")
      .order("tanggal", { ascending: false }),
    supabase
      .from("kegiatan")
      .select("*")
      .eq("status", "terjadwal")
      .order("tanggal", { ascending: true })
      .limit(3),
  ]);

  const active = (activeKegiatan as KegiatanRow[]) || [];
  const upcoming = (upcomingKegiatan as KegiatanRow[]) || [];

  const activeIds = active.map((k) => k.id);
  const panitiaCountMap = new Map<string, number>();
  if (activeIds.length > 0) {
    const { data: panitiaRows } = await supabase
      .from("kegiatan_panitia")
      .select("kegiatan_id")
      .in("kegiatan_id", activeIds);
    for (const row of panitiaRows ?? []) {
      panitiaCountMap.set(
        row.kegiatan_id,
        (panitiaCountMap.get(row.kegiatan_id) ?? 0) + 1
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Presensi Kegiatan</h1>
        <p className="text-sm text-muted-foreground">
          Pilih kegiatan yang sedang aktif untuk mulai memindai barcode presensi panitia.
        </p>
      </div>

      {/* Sesi Aktif */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <Radio className="size-4" aria-hidden="true" />
          <span>Sedang Berlangsung ({active.length})</span>
        </div>

        {active.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <CalendarClock className="size-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold text-base">Tidak ada kegiatan aktif</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Saat ini belum ada kegiatan berstatus sedang berlangsung. Silakan minta Administrator untuk mengaktifkan sesi kegiatan.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {active.map((k) => {
              const panitiaTotal = panitiaCountMap.get(k.id) ?? 0;
              return (
                <Card key={k.id} className="border-emerald-500/30 bg-emerald-500/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-bold text-foreground">
                        {k.nama_kegiatan}
                      </CardTitle>
                      <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50 shrink-0">
                        Aktif
                      </Badge>
                    </div>
                    {k.deskripsi && (
                      <CardDescription className="text-xs line-clamp-2">
                        {k.deskripsi}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 shrink-0 text-foreground" />
                        <span>{k.waktu_mulai.slice(0, 5)} WIB</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0 text-foreground" />
                        <span className="truncate">{k.lokasi}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                        <Users className="size-3.5 shrink-0 text-foreground" />
                        <span>
                          {panitiaTotal > 0
                            ? `${panitiaTotal} Panitia terdaftar`
                            : "Panitia belum diimpor"}
                        </span>
                      </div>
                    </div>

                    <Link href={`/petugas/scan/${k.id}`} className="block">
                      <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                        <QrCode className="size-4" />
                        Mulai Scan Presensi
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Kegiatan Mendatang */}
      {upcoming.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Calendar className="size-4" />
            <span>Kegiatan Terjadwal Berikutnya</span>
          </div>

          <div className="grid gap-2">
            {upcoming.map((u) => (
              <Card key={u.id} className="bg-muted/30">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{u.nama_kegiatan}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(u.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      • {u.lokasi}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Terjadwal
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
