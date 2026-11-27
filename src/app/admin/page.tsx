import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Package,
  Calendar,
  CheckCircle2,
  ArrowRight,
  History,
  UserCog,
  Clock,
} from "lucide-react";
import type { ActivityLogRow, ProfileRow, ActivityLogAction, EntityType } from "@/types/database";

export const metadata = {
  title: "Dashboard Admin | Kesekretariatan HIMA",
};

const actionBadges: Record<ActivityLogAction, { label: string; className: string }> = {
  CREATE: { label: "Buat", className: "border-emerald-500/30 text-emerald-600 bg-emerald-50" },
  UPDATE: { label: "Edit", className: "border-blue-500/30 text-blue-600 bg-blue-50" },
  DELETE: { label: "Hapus", className: "border-rose-500/30 text-rose-600 bg-rose-50" },
  SCAN_ABSEN: { label: "Presensi", className: "border-purple-500/30 text-purple-600 bg-purple-50" },
  TOGGLE_PETUGAS: { label: "Status Akun", className: "border-amber-500/30 text-amber-600 bg-amber-50" },
};

const entityLabels: Record<EntityType, string> = {
  anggota: "Anggota",
  inventaris: "Inventaris",
  kegiatan: "Kegiatan",
  panitia: "Panitia",
  absensi: "Presensi",
  profiles: "Pengguna",
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Ambil KPI & Log terbaru secara paralel
  const [
    { count: totalAnggotaAktif },
    { count: totalInventaris },
    { count: totalKegiatan },
    { count: totalAbsensi },
    { data: rawLogs },
  ] = await Promise.all([
    supabase.from("anggota").select("*", { count: "exact", head: true }).eq("status", "aktif"),
    supabase.from("inventaris").select("*", { count: "exact", head: true }),
    supabase.from("kegiatan").select("*", { count: "exact", head: true }),
    supabase.from("absensi").select("*", { count: "exact", head: true }),
    supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(10),
  ]);

  const logs = (rawLogs as ActivityLogRow[]) || [];

  // Ambil nama actor jika ada
  const actorIds = Array.from(new Set(logs.map((l) => l.actor_id).filter(Boolean))) as string[];
  let actorMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, nama_lengkap")
      .in("id", actorIds);
    if (actors) {
      actorMap = new Map((actors as ProfileRow[]).map((a) => [a.id, a.nama_lengkap]));
    }
  }

  const kpis = [
    {
      title: "Anggota Aktif",
      value: totalAnggotaAktif ?? 0,
      desc: "Total kader & pengurus aktif",
      icon: Users,
      href: "/admin/anggota",
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Item Inventaris",
      value: totalInventaris ?? 0,
      desc: "Total barang & aset sekretariat",
      icon: Package,
      href: "/admin/inventaris",
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    },
    {
      title: "Total Kegiatan",
      value: totalKegiatan ?? 0,
      desc: "Agenda dan sesi kegiatan HIMA",
      icon: Calendar,
      href: "/admin/kegiatan",
      color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30",
    },
    {
      title: "Total Presensi",
      value: totalAbsensi ?? 0,
      desc: "Total kehadiran tercatat",
      icon: CheckCircle2,
      href: "/admin/kegiatan",
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Ringkasan</h1>
          <p className="text-sm text-muted-foreground">
            Sistem Informasi Kesekretariatan & Presensi HIMA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/logs">
            <Button variant="outline" size="sm" className="gap-2">
              <History className="size-4" />
              <span>Semua Log Aktivitas</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.title} href={kpi.href}>
              <Card className="hover:border-primary/50 transition-all hover:shadow-md cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">
                    {kpi.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${kpi.color}`}>
                    <Icon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.desc}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/anggota">
          <Card className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Kelola Anggota</p>
                <p className="text-xs text-muted-foreground">Cetak kartu barcode</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Card>
        </Link>

        <Link href="/admin/inventaris">
          <Card className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Package className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Inventaris Aset</p>
                <p className="text-xs text-muted-foreground">Pencatatan barang</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Card>
        </Link>

        <Link href="/admin/kegiatan">
          <Card className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Calendar className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Sesi Kegiatan</p>
                <p className="text-xs text-muted-foreground">Rekap & export CSV</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Card>
        </Link>

        <Link href="/admin/petugas">
          <Card className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCog className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Akun Petugas</p>
                <p className="text-xs text-muted-foreground">Akses scan presensi</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Card>
        </Link>
      </div>

      {/* Recent Activity Logs */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            <span className="font-semibold text-base">Aktivitas Sistem Terbaru</span>
          </div>
          <Link href="/admin/logs" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
            <span>Lihat Semua Log</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="divide-y">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Belum ada catatan aktivitas di sistem.
            </div>
          ) : (
            logs.map((log) => {
              const badge = actionBadges[log.action] || {
                label: log.action,
                className: "border-muted text-muted-foreground",
              };
              const actorName = log.actor_id
                ? actorMap.get(log.actor_id) || "Pengguna"
                : "Sistem";

              return (
                <div key={log.id} className="p-3.5 sm:px-4 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badge.className}`}>
                        {badge.label}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {entityLabels[log.entity_type] || log.entity_type}
                      </Badge>
                      <span className="font-medium text-foreground">
                        {actorName}
                        {log.actor_role && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({log.actor_role})
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 font-medium truncate">
                      {log.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0 text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="size-3" />
                    <span>
                      {new Date(log.created_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
