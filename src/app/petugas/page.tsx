import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Calendar, Clock, MapPin, Radio, CalendarClock } from "lucide-react";
import type { KegiatanRow } from "@/types/database";

export const metadata = {
  title: "Pilih Kegiatan | Petugas Presensi",
};

export default async function PetugasHomePage() {
  const supabase = await createClient();

  // Ambil kegiatan yang sedang berlangsung
  const { data: activeKegiatan } = await supabase
    .from("kegiatan")
    .select("*")
    .eq("status", "berlangsung")
    .order("tanggal", { ascending: false });

  // Ambil juga kegiatan terjadwal sebagai informasi
  const { data: upcomingKegiatan } = await supabase
    .from("kegiatan")
    .select("*")
    .eq("status", "terjadwal")
    .order("tanggal", { ascending: true })
    .limit(3);

  const active = (activeKegiatan as KegiatanRow[]) || [];
  const upcoming = (upcomingKegiatan as KegiatanRow[]) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Presensi Kegiatan</h1>
        <p className="text-sm text-muted-foreground">
          Pilih kegiatan yang sedang aktif untuk mulai memindai barcode presensi.
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
            {active.map((k) => (
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
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5 shrink-0 text-foreground" />
                      <span>{k.waktu_mulai.slice(0, 5)} WIB</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 shrink-0 text-foreground" />
                      <span className="truncate">{k.lokasi}</span>
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
            ))}
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
