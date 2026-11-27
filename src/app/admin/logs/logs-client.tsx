"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  History,
  Code,
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCcw,
} from "lucide-react";
import type { ActivityLogRow, ActivityLogAction } from "@/types/database";

export interface LogWithActor extends ActivityLogRow {
  actor_name: string;
}

interface LogsClientProps {
  initialLogs: LogWithActor[];
}

const actionBadges: Record<ActivityLogAction, { label: string; className: string }> = {
  CREATE: { label: "CREATE", className: "border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
  UPDATE: { label: "UPDATE", className: "border-blue-500/30 text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
  DELETE: { label: "DELETE", className: "border-rose-500/30 text-rose-600 bg-rose-50 dark:bg-rose-950/30" },
  SCAN_ABSEN: { label: "SCAN_ABSEN", className: "border-purple-500/30 text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
  TOGGLE_PETUGAS: { label: "TOGGLE_PETUGAS", className: "border-amber-500/30 text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
};

const PAGE_SIZE = 15;

export function LogsClient({ initialLogs }: LogsClientProps) {
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState<string>("ALL");
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  // Selected JSON detail modal
  const [selectedLog, setSelectedLog] = useState<LogWithActor | null>(null);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      // 1. Text search
      const textMatch =
        log.description.toLowerCase().includes(search.toLowerCase()) ||
        log.actor_name.toLowerCase().includes(search.toLowerCase()) ||
        (log.entity_id && log.entity_id.toLowerCase().includes(search.toLowerCase()));

      // 2. Module filter
      const moduleMatch = filterModule === "ALL" || log.entity_type === filterModule;

      // 3. Action filter
      const actionMatch = filterAction === "ALL" || log.action === filterAction;

      // 4. Date range filter
      let dateMatch = true;
      const logDate = new Date(log.created_at).toISOString().split("T")[0];
      if (startDate && logDate < startDate) dateMatch = false;
      if (endDate && logDate > endDate) dateMatch = false;

      return textMatch && moduleMatch && actionMatch && dateMatch;
    });
  }, [initialLogs, search, filterModule, filterAction, startDate, endDate]);

  // Reset page when filter changes
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  const resetFilters = () => {
    setSearch("");
    setFilterModule("ALL");
    setFilterAction("ALL");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="size-6 text-primary" />
            <span>Log Aktivitas Sistem</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Audit trail seluruh aksi penting, perubahan data master, dan presensi anggota.
          </p>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Total Log: <span className="font-bold text-foreground">{filteredLogs.length}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border bg-card space-y-3 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Cari deskripsi atau pelaku..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>

          <NativeSelect
            aria-label="Filter modul log"
            value={filterModule}
            onChange={(e) => {
              setFilterModule(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">Semua Modul (Entitas)</option>
            <option value="anggota">Modul: Anggota</option>
            <option value="inventaris">Modul: Inventaris</option>
            <option value="kegiatan">Modul: Kegiatan</option>
            <option value="panitia">Modul: Panitia</option>
            <option value="absensi">Modul: Presensi</option>
            <option value="profiles">Modul: Pengguna / Petugas</option>
          </NativeSelect>

          <NativeSelect
            aria-label="Filter jenis aksi log"
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">Semua Aksi</option>
            <option value="CREATE">Aksi: CREATE</option>
            <option value="UPDATE">Aksi: UPDATE</option>
            <option value="DELETE">Aksi: DELETE</option>
            <option value="SCAN_ABSEN">Aksi: SCAN_ABSEN</option>
            <option value="TOGGLE_PETUGAS">Aksi: TOGGLE_PETUGAS</option>
          </NativeSelect>

          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="gap-1.5 text-xs h-9 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset Filter
          </Button>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
          <span className="font-medium">Rentang Tanggal:</span>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 text-xs w-36"
            />
            <span>s/d</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 text-xs w-36"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Waktu</TableHead>
              <TableHead>Pelaku</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Modul</TableHead>
              <TableHead>Deskripsi Aktivitas</TableHead>
              <TableHead className="text-right">Payload</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Tidak ada data log aktivitas yang cocok dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              currentItems.map((log) => {
                const badge = actionBadges[log.action] || {
                  label: log.action,
                  className: "border-muted text-muted-foreground",
                };

                return (
                  <TableRow key={log.id} className="text-xs">
                    <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                      <div className="font-semibold text-foreground">
                        {new Date(log.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <Clock className="size-3" />
                        {new Date(log.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}{" "}
                        WIB
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{log.actor_name}</div>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {log.actor_role || "sistem"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${badge.className}`}>
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-[10px]">
                        {log.entity_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="font-medium leading-relaxed text-foreground">
                        {log.description}
                      </p>
                      {log.entity_id && (
                        <span className="text-[10px] font-mono text-muted-foreground block truncate">
                          ID: {log.entity_id}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.details ? (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setSelectedLog(log)}
                          className="gap-1 text-[11px]"
                          title="Lihat rincian JSON"
                        >
                          <Code className="size-3" />
                          <span>JSON</span>
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Halaman {currentPage} dari {totalPages} ({filteredLogs.length} entri)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="Halaman sebelumnya"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="Halaman berikutnya"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* JSON Viewer Dialog */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="size-5 text-primary" />
              <span>Detail Metadata Aktivitas</span>
            </DialogTitle>
            <DialogDescription>
              Payload data audit trail untuk {selectedLog?.action} ({selectedLog?.entity_type})
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3 pt-2">
              <div className="p-2.5 rounded-lg bg-muted text-xs space-y-1">
                <p>
                  <strong>Deskripsi:</strong> {selectedLog.description}
                </p>
                <p>
                  <strong>Waktu:</strong> {new Date(selectedLog.created_at).toLocaleString("id-ID")}
                </p>
                <p>
                  <strong>Pelaku:</strong> {selectedLog.actor_name} ({selectedLog.actor_role || "-"})
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  JSON Details:
                </label>
                <pre className="p-3 rounded-lg bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto max-h-72 border border-border">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
