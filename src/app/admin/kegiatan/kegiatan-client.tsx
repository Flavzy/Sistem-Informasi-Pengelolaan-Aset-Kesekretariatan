"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createKegiatanAction,
  updateKegiatanAction,
  updateKegiatanStatusAction,
  deleteKegiatanAction,
} from "@/lib/actions/kegiatan";
import type { KegiatanRow, KegiatanStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  CalendarPlus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  Eye,
  MapPin,
  Clock,
  Play,
  CheckCircle2,
} from "lucide-react";

interface KegiatanClientProps {
  initialKegiatan: KegiatanRow[];
  panitiaCounts: Record<string, number>;
  absensiCounts: Record<string, number>;
}

const statusBadgeStyles: Record<KegiatanStatus, string> = {
  terjadwal: "border-blue-500/30 text-blue-700 bg-blue-50 dark:bg-blue-950/30",
  berlangsung: "border-emerald-500/30 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30",
  selesai: "border-border text-muted-foreground bg-muted/60",
};

export function KegiatanClient({
  initialKegiatan,
  panitiaCounts,
  absensiCounts,
}: KegiatanClientProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingKegiatan, setEditingKegiatan] = useState<KegiatanRow | null>(null);

  const filteredKegiatan = initialKegiatan.filter((k) => {
    const matchSearch =
      k.nama_kegiatan.toLowerCase().includes(search.toLowerCase()) ||
      k.lokasi.toLowerCase().includes(search.toLowerCase()) ||
      (k.deskripsi && k.deskripsi.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === "ALL" || k.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createKegiatanAction(formData);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setIsCreateOpen(false);
      }
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateKegiatanAction(formData);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setEditingKegiatan(null);
      }
    });
  };

  const handleQuickStatusChange = (kegiatan: KegiatanRow, newStatus: KegiatanStatus) => {
    startTransition(async () => {
      const res = await updateKegiatanStatusAction(kegiatan.id, newStatus, kegiatan.nama_kegiatan);
      if (res.error) {
        alert(res.error);
      }
    });
  };

  const handleDelete = (kegiatan: KegiatanRow) => {
    if (!confirm(`Hapus kegiatan "${kegiatan.nama_kegiatan}"? Semua data presensi kegiatan ini juga akan dihapus.`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteKegiatanAction(kegiatan.id, kegiatan.nama_kegiatan);
      if (res.error) {
        alert(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jadwal & Kegiatan HIMA</h1>
          <p className="text-sm text-muted-foreground">
            Kelola agenda kegiatan, status pelaksanaan, dan rekapitulasi kehadiran peserta.
          </p>
        </div>
        <Button
          onClick={() => {
            setErrorMessage(null);
            setIsCreateOpen(true);
          }}
          className="gap-2 shrink-0"
        >
          <CalendarPlus className="size-4" />
          Tambah Kegiatan
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari nama atau lokasi kegiatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <NativeSelect
          aria-label="Filter status kegiatan"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="sm:w-48"
        >
          <option value="ALL">Semua Status</option>
          <option value="terjadwal">Terjadwal</option>
          <option value="berlangsung">Sedang Berlangsung</option>
          <option value="selesai">Selesai</option>
        </NativeSelect>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kegiatan & Lokasi</TableHead>
              <TableHead>Jadwal</TableHead>
              <TableHead>Panitia</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ubah Status Cepat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredKegiatan.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Tidak ada agenda kegiatan yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredKegiatan.map((k) => {
                const panitiaTotal = panitiaCounts[k.id] ?? 0;
                const hadirTotal = absensiCounts[k.id] ?? 0;
                return (
                <TableRow key={k.id}>
                  <TableCell>
                    <div className="font-semibold">{k.nama_kegiatan}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="size-3" />
                      <span>{k.lokasi}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {new Date(k.tanggal).toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="size-3" />
                      <span>
                        {k.waktu_mulai.slice(0, 5)} {k.waktu_selesai ? `- ${k.waktu_selesai.slice(0, 5)}` : "WIB"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {panitiaTotal > 0 ? (
                      <div className="text-xs">
                        <span className="font-semibold text-foreground">{panitiaTotal} Panitia</span>
                        <span className="block text-muted-foreground">{hadirTotal} hadir</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-700 bg-amber-50 dark:bg-amber-950/30 text-[11px]">
                        Belum diimpor
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadgeStyles[k.status]}>
                      {k.status === "berlangsung" && <span className="size-1.5 rounded-full bg-emerald-600 mr-1" aria-hidden="true" />}
                      <span className="capitalize">{k.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {k.status !== "berlangsung" && (
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={isPending}
                          onClick={() => handleQuickStatusChange(k, "berlangsung")}
                          className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="Mulai kegiatan sekarang (petugas bisa scan)"
                        >
                          <Play className="size-3" />
                          Mulai
                        </Button>
                      )}
                      {k.status !== "selesai" && (
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={isPending}
                          onClick={() => handleQuickStatusChange(k, "selesai")}
                          className="gap-1 text-muted-foreground hover:text-foreground"
                          title="Tandai kegiatan selesai"
                        >
                          <CheckCircle2 className="size-3" />
                          Selesai
                        </Button>
                      )}
                      {k.status !== "terjadwal" && (
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={isPending}
                          onClick={() => handleQuickStatusChange(k, "terjadwal")}
                          className="text-xs text-muted-foreground"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/kegiatan/${k.id}`}>
                        <Button variant="outline" size="xs" className="gap-1 text-xs" title="Kelola panitia & presensi">
                          <Eye className="size-3.5" />
                          <span className="hidden sm:inline">Panitia & Presensi</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${k.nama_kegiatan}`}
                        onClick={() => {
                          setErrorMessage(null);
                          setEditingKegiatan(k);
                        }}
                        title="Edit kegiatan"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Hapus ${k.nama_kegiatan}`}
                        disabled={isPending}
                        onClick={() => handleDelete(k)}
                        className="text-destructive hover:bg-destructive/10"
                        title="Hapus kegiatan"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Kegiatan Baru</DialogTitle>
            <DialogDescription>
              Buat agenda kegiatan baru untuk membuka sesi presensi anggota.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              <AlertCircle className="size-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-3.5 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="nama_kegiatan">Nama Kegiatan</Label>
              <Input id="nama_kegiatan" name="nama_kegiatan" placeholder="Rapat Pleno / LDKM" required disabled={isPending} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deskripsi">Deskripsi (Opsional)</Label>
              <Input id="deskripsi" name="deskripsi" placeholder="Agenda pembahasan..." disabled={isPending} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tanggal">Tanggal Pelaksanaan</Label>
                <Input id="tanggal" name="tanggal" type="date" required disabled={isPending} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lokasi">Lokasi / Ruangan</Label>
                <Input id="lokasi" name="lokasi" placeholder="Lab Komputer / Aula" required disabled={isPending} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="waktu_mulai">Waktu Mulai</Label>
                <Input id="waktu_mulai" name="waktu_mulai" type="time" required disabled={isPending} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="waktu_selesai">Waktu Selesai (Opsional)</Label>
                <Input id="waktu_selesai" name="waktu_selesai" type="time" disabled={isPending} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Status Awal</Label>
              <NativeSelect
                id="status"
                name="status"
                defaultValue="terjadwal"
                disabled={isPending}
              >
                <option value="terjadwal">Terjadwal</option>
                <option value="berlangsung">Sedang Berlangsung (Bisa langsung discan)</option>
                <option value="selesai">Selesai</option>
              </NativeSelect>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-900/10 pt-4 mt-2 dark:border-white/10">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingKegiatan} onOpenChange={(open) => !open && setEditingKegiatan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Kegiatan</DialogTitle>
            <DialogDescription>Perbarui rincian dan jadwal kegiatan</DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              <AlertCircle className="size-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {editingKegiatan && (
            <form onSubmit={handleUpdateSubmit} className="space-y-3.5 pt-1">
              <input type="hidden" name="id" value={editingKegiatan.id} />

              <div className="space-y-1.5">
                <Label htmlFor="edit_nama">Nama Kegiatan</Label>
                <Input id="edit_nama" name="nama_kegiatan" defaultValue={editingKegiatan.nama_kegiatan} required disabled={isPending} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit_deskripsi">Deskripsi</Label>
                <Input id="edit_deskripsi" name="deskripsi" defaultValue={editingKegiatan.deskripsi || ""} disabled={isPending} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_tanggal">Tanggal</Label>
                  <Input id="edit_tanggal" name="tanggal" type="date" defaultValue={editingKegiatan.tanggal} required disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_lokasi">Lokasi</Label>
                  <Input id="edit_lokasi" name="lokasi" defaultValue={editingKegiatan.lokasi} required disabled={isPending} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_mulai">Waktu Mulai</Label>
                  <Input id="edit_mulai" name="waktu_mulai" type="time" defaultValue={editingKegiatan.waktu_mulai.slice(0, 5)} required disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_selesai">Waktu Selesai</Label>
                  <Input id="edit_selesai" name="waktu_selesai" type="time" defaultValue={editingKegiatan.waktu_selesai ? editingKegiatan.waktu_selesai.slice(0, 5) : ""} disabled={isPending} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit_status">Status</Label>
                <NativeSelect
                  id="edit_status"
                  name="status"
                  defaultValue={editingKegiatan.status}
                  disabled={isPending}
                >
                  <option value="terjadwal">Terjadwal</option>
                  <option value="berlangsung">Sedang Berlangsung</option>
                  <option value="selesai">Selesai</option>
                </NativeSelect>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-900/10 pt-4 mt-2 dark:border-white/10">
                <Button type="button" variant="outline" onClick={() => setEditingKegiatan(null)} disabled={isPending}>
                  Batal
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
