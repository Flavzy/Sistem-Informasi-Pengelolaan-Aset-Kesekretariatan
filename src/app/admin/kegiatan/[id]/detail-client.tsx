"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Download,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  QrCode,
  Keyboard,
} from "lucide-react";
import type { KegiatanRow } from "@/types/database";

export interface AttendanceItem {
  id: string;
  waktu_absen: string;
  metode: "scan" | "manual";
  anggota: {
    nama_lengkap: string;
    npm: string;
    divisi: string;
  };
  dicatat_oleh_nama: string;
}

interface KegiatanDetailClientProps {
  kegiatan: KegiatanRow;
  attendance: AttendanceItem[];
}

export function KegiatanDetailClient({
  kegiatan,
  attendance,
}: KegiatanDetailClientProps) {
  const exportToCSV = () => {
    const headers = [
      "No",
      "NPM",
      "Nama Lengkap",
      "Divisi",
      "Waktu Hadir",
      "Metode Presensi",
      "Petugas Pencatat",
    ];

    const rows = attendance.map((item, idx) => [
      idx + 1,
      `'${item.anggota.npm}`, // Prefix kutip agar NPM tidak terkonversi jadi eksponensial di Excel
      `"${item.anggota.nama_lengkap.replace(/"/g, '""')}"`,
      `"${item.anggota.divisi.replace(/"/g, '""')}"`,
      `"${new Date(item.waktu_absen).toLocaleString("id-ID")}"`,
      `"${item.metode.toUpperCase()}"`,
      `"${item.dicatat_oleh_nama.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = kegiatan.nama_kegiatan.replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `Presensi_${safeTitle}_${kegiatan.tanggal}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/kegiatan">
            <Button variant="outline" size="icon-sm">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {kegiatan.nama_kegiatan}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Detail kegiatan dan rekapitulasi daftar hadir
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {kegiatan.status === "berlangsung" && (
            <Link href={`/petugas/scan/${kegiatan.id}`}>
              <Button variant="default" size="sm" className="gap-2">
                <QrCode className="size-4" />
                Buka Scanner
              </Button>
            </Link>
          )}
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={attendance.length === 0}
          >
            <Download className="size-4" />
            Export CSV ({attendance.length})
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Kehadiran
            </CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {attendance.length}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Anggota telah hadir
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Waktu Pelaksanaan
            </CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">
              {new Date(kegiatan.tanggal).toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="size-3" />
              {kegiatan.waktu_mulai.slice(0, 5)}{" "}
              {kegiatan.waktu_selesai
                ? `- ${kegiatan.waktu_selesai.slice(0, 5)}`
                : "WIB"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Lokasi
            </CardTitle>
            <MapPin className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold truncate">
              {kegiatan.lokasi}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tempat pelaksanaan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Status Kegiatan
            </CardTitle>
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge
              variant="outline"
              className={
                kegiatan.status === "berlangsung"
                  ? "border-emerald-500/30 text-emerald-600 bg-emerald-50 capitalize"
                  : "capitalize"
              }
            >
              {kegiatan.status}
            </Badge>
            {kegiatan.deskripsi && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {kegiatan.deskripsi}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b p-4 flex items-center justify-between">
          <div className="font-semibold text-base flex items-center gap-2">
            <span>Daftar Hadir Anggota</span>
            <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5 font-bold">
              {attendance.length}
            </span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">No</TableHead>
              <TableHead>Anggota</TableHead>
              <TableHead>Divisi</TableHead>
              <TableHead>Waktu Hadir</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead className="text-right">Dicatat Oleh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendance.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  Belum ada presensi yang tercatat untuk kegiatan ini.
                </TableCell>
              </TableRow>
            ) : (
              attendance.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">
                      {item.anggota.nama_lengkap}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">
                      {item.anggota.npm}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{item.anggota.divisi}</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(item.waktu_absen).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}{" "}
                    WIB
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="gap-1 text-[11px] capitalize"
                    >
                      {item.metode === "scan" ? (
                        <QrCode className="size-3 text-emerald-600" />
                      ) : (
                        <Keyboard className="size-3 text-blue-600" />
                      )}
                      {item.metode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {item.dicatat_oleh_nama}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
