"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  clearPanitiaKegiatanAction,
  deletePanitiaAction,
} from "@/lib/actions/panitia";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, NativeSelect } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportPanitiaDialog } from "./import-panitia-dialog";
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
  Upload,
  Search,
  Trash2,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import type { KegiatanRow, KegiatanPanitiaRow } from "@/types/database";

export interface AttendanceItem {
  id: string;
  panitia_id: string | null;
  waktu_absen: string;
  metode: "scan" | "manual";
  panitia: {
    nama_lengkap: string;
    npm: string;
    jabatan: string;
    divisi: string;
  };
  dicatat_oleh_nama: string;
}

interface KegiatanDetailClientProps {
  kegiatan: KegiatanRow;
  panitiaList: KegiatanPanitiaRow[];
  attendance: AttendanceItem[];
}

export function KegiatanDetailClient({
  kegiatan,
  panitiaList,
  attendance,
}: KegiatanDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"hadir" | "panitia">(
    panitiaList.length === 0 ? "panitia" : "hadir"
  );
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterDivisi, setFilterDivisi] = useState("ALL");
  const [filterStatusHadir, setFilterStatusHadir] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const attendedPanitiaIds = useMemo(
    () =>
      new Set(
        attendance
          .map((a) => a.panitia_id)
          .filter((id): id is string => Boolean(id))
      ),
    [attendance]
  );

  const attendedNpms = useMemo(
    () => new Set(attendance.map((a) => a.panitia.npm)),
    [attendance]
  );

  const divisiList = useMemo(() => {
    const source =
      activeTab === "panitia"
        ? panitiaList.map((p) => p.divisi)
        : attendance.map((a) => a.panitia.divisi);
    return Array.from(new Set(source.filter((d) => d && d !== "-"))).sort();
  }, [activeTab, panitiaList, attendance]);

  const filteredAttendance = useMemo(() => {
    const q = search.toLowerCase();
    return attendance.filter((item) => {
      const matchText =
        item.panitia.nama_lengkap.toLowerCase().includes(q) ||
        item.panitia.npm.toLowerCase().includes(q) ||
        item.panitia.jabatan.toLowerCase().includes(q);
      const matchDivisi =
        filterDivisi === "ALL" || item.panitia.divisi === filterDivisi;
      return matchText && matchDivisi;
    });
  }, [attendance, search, filterDivisi]);

  const filteredPanitia = useMemo(() => {
    const q = search.toLowerCase();
    return panitiaList.filter((p) => {
      const isHadir = attendedPanitiaIds.has(p.id) || attendedNpms.has(p.npm);
      const matchText =
        p.nama_lengkap.toLowerCase().includes(q) ||
        p.npm.toLowerCase().includes(q) ||
        p.jabatan.toLowerCase().includes(q);
      const matchDivisi = filterDivisi === "ALL" || p.divisi === filterDivisi;
      const matchStatus =
        filterStatusHadir === "ALL" ||
        (filterStatusHadir === "hadir" && isHadir) ||
        (filterStatusHadir === "belum" && !isHadir);
      return matchText && matchDivisi && matchStatus;
    });
  }, [panitiaList, attendedPanitiaIds, attendedNpms, search, filterDivisi, filterStatusHadir]);

  const handleDeletePanitia = (panitia: KegiatanPanitiaRow) => {
    if (
      !confirm(
        `Hapus ${panitia.nama_lengkap} (${panitia.npm}) dari daftar panitia kegiatan ini?`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deletePanitiaAction(
        panitia.id,
        kegiatan.id,
        panitia.nama_lengkap,
        panitia.npm
      );
      if (res.error) alert(res.error);
    });
  };

  const handleClearPanitia = () => {
    if (
      !confirm(
        `Kosongkan seluruh (${panitiaList.length}) data panitia pada kegiatan "${kegiatan.nama_kegiatan}"? Data presensi yang terhubung juga akan terhapus.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await clearPanitiaKegiatanAction(
        kegiatan.id,
        kegiatan.nama_kegiatan
      );
      if (res.error) alert(res.error);
    });
  };

  const exportToCSV = () => {
    const headers = [
      "No",
      "NPM",
      "Nama Lengkap",
      "Jabatan",
      "Divisi",
      "Waktu Hadir",
      "Metode Presensi",
      "Petugas Pencatat",
    ];

    const rows = attendance.map((item, idx) => [
      idx + 1,
      `'${item.panitia.npm}`,
      `"${item.panitia.nama_lengkap.replace(/"/g, '""')}"`,
      `"${item.panitia.jabatan.replace(/"/g, '""')}"`,
      `"${item.panitia.divisi.replace(/"/g, '""')}"`,
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
              Operasional panitia kegiatan dan rekapitulasi daftar hadir
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImportSuccess(null);
              setIsImportOpen(true);
            }}
            className="gap-2"
          >
            <Upload className="size-4" />
            Import Panitia (.xlsx)
          </Button>
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

      {importSuccess && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{importSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportSuccess(null)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      {panitiaList.length === 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 p-4 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Daftar panitia kegiatan masih kosong</p>
              <p className="mt-0.5 opacity-90">
                Presensi hanya menerima peserta yang terdaftar pada daftar panitia kegiatan ini. Impor file Excel berisi kolom{" "}
                <strong>NPM, Nama, Jabatan, Divisi</strong> terlebih dahulu.
              </p>
            </div>
          </div>
          <Button
            size="xs"
            onClick={() => setIsImportOpen(true)}
            className="gap-1.5 shrink-0"
          >
            <Upload className="size-3.5" />
            Import Sekarang
          </Button>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Kehadiran Panitia
            </CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {attendance.length}
              {panitiaList.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {panitiaList.length}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {panitiaList.length > 0
                ? "Panitia tercatat hadir"
                : "Belum ada panitia terdaftar"}
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

      {/* Tabs + Table Card */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={activeTab === "hadir" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTab("hadir");
                setFilterDivisi("ALL");
              }}
              className="gap-1.5"
            >
              <UserCheck className="size-4" />
              <span>Daftar Hadir</span>
              <span className="text-xs rounded-full bg-background/20 px-1.5 py-0.5 font-bold">
                {attendance.length}
              </span>
            </Button>
            <Button
              type="button"
              variant={activeTab === "panitia" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTab("panitia");
                setFilterDivisi("ALL");
              }}
              className="gap-1.5"
            >
              <Users className="size-4" />
              <span>Data Panitia</span>
              <span className="text-xs rounded-full bg-background/20 px-1.5 py-0.5 font-bold">
                {panitiaList.length}
              </span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Cari NPM, nama, jabatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <NativeSelect
              aria-label="Filter divisi panitia"
              value={filterDivisi}
              onChange={(e) => setFilterDivisi(e.target.value)}
              className="sm:w-44"
            >
              <option value="ALL">Semua Divisi</option>
              {divisiList.map((d) => (
                <option key={d} value={d}>
                  Divisi: {d}
                </option>
              ))}
            </NativeSelect>

            {activeTab === "panitia" && (
              <>
                <NativeSelect
                  aria-label="Filter status kehadiran"
                  value={filterStatusHadir}
                  onChange={(e) => setFilterStatusHadir(e.target.value)}
                  className="sm:w-40"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="hadir">Sudah Hadir</option>
                  <option value="belum">Belum Hadir</option>
                </NativeSelect>

                {panitiaList.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={handleClearPanitia}
                    className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    Kosongkan
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {activeTab === "hadir" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Panitia</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Divisi Panitia</TableHead>
                <TableHead>Waktu Hadir</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead className="text-right">Dicatat Oleh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {attendance.length === 0
                      ? "Belum ada presensi yang tercatat untuk kegiatan ini."
                      : "Tidak ada data hadir yang cocok dengan filter."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendance.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">
                        {item.panitia.nama_lengkap}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {item.panitia.npm}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {item.panitia.jabatan}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.panitia.divisi}
                      </Badge>
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
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>NPM & Nama</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Divisi Panitia</TableHead>
                <TableHead>Status Presensi</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPanitia.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {panitiaList.length === 0
                      ? 'Belum ada data panitia. Klik "Import Panitia (.xlsx)" untuk menambahkan.'
                      : "Tidak ada data panitia yang cocok dengan filter."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPanitia.map((p, idx) => {
                  const isHadir =
                    attendedPanitiaIds.has(p.id) || attendedNpms.has(p.npm);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{p.nama_lengkap}</div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {p.npm}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{p.jabatan}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {p.divisi}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isHadir ? "outline" : "secondary"}
                          className={
                            isHadir
                              ? "border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                              : "text-muted-foreground"
                          }
                        >
                          {isHadir ? "Hadir" : "Belum Hadir"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Hapus ${p.nama_lengkap}`}
                          disabled={isPending}
                          onClick={() => handleDeletePanitia(p)}
                          className="text-destructive hover:bg-destructive/10"
                          title="Hapus dari daftar panitia"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <ImportPanitiaDialog
        kegiatanId={kegiatan.id}
        namaKegiatan={kegiatan.nama_kegiatan}
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImported={(summary) => {
          setImportSuccess(summary);
          setActiveTab("panitia");
        }}
      />
    </div>
  );
}
