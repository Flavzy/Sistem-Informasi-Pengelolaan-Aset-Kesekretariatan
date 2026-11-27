"use client";

import { useState, useTransition, useMemo } from "react";
import {
  createAnggotaAction,
  updateAnggotaAction,
  deleteAnggotaAction,
} from "@/lib/actions/anggota";
import type { AnggotaRow } from "@/types/database";
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
import { BarcodeDialog } from "./barcode-dialog";
import { ImportExcelDialog } from "./import-excel-dialog";
import { exportAnggotaToExcel } from "@/lib/anggota-excel";
import {
  UserPlus,
  Pencil,
  Trash2,
  Barcode,
  Search,
  Loader2,
  AlertCircle,
  Upload,
  Download,
  CheckCircle2,
} from "lucide-react";

interface AnggotaClientProps {
  initialAnggota: AnggotaRow[];
}

export function AnggotaClient({ initialAnggota }: AnggotaClientProps) {
  const [search, setSearch] = useState("");
  const [filterDivisi, setFilterDivisi] = useState<string>("ALL");
  const [filterAngkatan, setFilterAngkatan] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingAnggota, setEditingAnggota] = useState<AnggotaRow | null>(null);
  const [barcodeAnggota, setBarcodeAnggota] = useState<AnggotaRow | null>(null);

  // Dynamic filter lists
  const divisiList = useMemo(() => {
    const set = new Set(initialAnggota.map((a) => a.divisi).filter(Boolean));
    return Array.from(set).sort();
  }, [initialAnggota]);

  const angkatanList = useMemo(() => {
    const set = new Set(initialAnggota.map((a) => a.angkatan).filter(Boolean));
    return Array.from(set).sort();
  }, [initialAnggota]);

  const filteredAnggota = initialAnggota.filter((a) => {
    const matchSearch =
      a.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
      a.npm.toLowerCase().includes(search.toLowerCase());
    const matchDivisi = filterDivisi === "ALL" || a.divisi === filterDivisi;
    const matchAngkatan = filterAngkatan === "ALL" || a.angkatan === filterAngkatan;
    const matchStatus = filterStatus === "ALL" || a.status === filterStatus;
    return matchSearch && matchDivisi && matchAngkatan && matchStatus;
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createAnggotaAction(formData);
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
      const res = await updateAnggotaAction(formData);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setEditingAnggota(null);
      }
    });
  };

  const handleDelete = (anggota: AnggotaRow) => {
    if (!confirm(`Hapus anggota ${anggota.nama_lengkap} (${anggota.npm})?`)) return;

    startTransition(async () => {
      const res = await deleteAnggotaAction(anggota.id, anggota.nama_lengkap, anggota.npm);
      if (res.error) {
        alert(res.error);
      }
    });
  };

  const handleExportExcel = async () => {
    if (filteredAnggota.length === 0) return;
    setIsExporting(true);
    try {
      await exportAnggotaToExcel(filteredAnggota);
    } catch {
      alert("Gagal mengekspor data ke Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-1 lg:min-h-0">
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Anggota HIMA</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data pengurus, anggota, dan barcode presensi kegiatan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              setImportSuccess(null);
              setIsImportOpen(true);
            }}
            className="gap-2"
          >
            <Upload className="size-4" />
            Import Excel
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={filteredAnggota.length === 0 || isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Export Excel
          </Button>
          <Button
            onClick={() => {
              setErrorMessage(null);
              setIsCreateOpen(true);
            }}
            className="gap-2"
          >
            <UserPlus className="size-4" />
            Tambah Anggota
          </Button>
        </div>
      </div>

      {importSuccess && (
        <div className="flex shrink-0 items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm text-emerald-700 dark:text-emerald-300">
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

      {/* Filters & Search */}
      <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari NPM atau Nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <NativeSelect
          aria-label="Filter divisi"
          value={filterDivisi}
          onChange={(e) => setFilterDivisi(e.target.value)}
        >
          <option value="ALL">Semua Divisi</option>
          {divisiList.map((d) => (
            <option key={d} value={d}>
              Divisi: {d}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Filter angkatan"
          value={filterAngkatan}
          onChange={(e) => setFilterAngkatan(e.target.value)}
        >
          <option value="ALL">Semua Angkatan</option>
          {angkatanList.map((a) => (
            <option key={a} value={a}>
              Angkatan: {a}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Filter status anggota"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">Semua Status</option>
          <option value="aktif">Status: Aktif</option>
          <option value="nonaktif">Status: Nonaktif</option>
        </NativeSelect>
      </div>

      {/* Table */}
      <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0 lg:flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NPM & Nama</TableHead>
              <TableHead>Divisi / Jabatan</TableHead>
              <TableHead className="hidden md:table-cell">Angkatan</TableHead>
              <TableHead className="hidden lg:table-cell">Kontak</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAnggota.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Tidak ada data anggota yang sesuai.
                </TableCell>
              </TableRow>
            ) : (
              filteredAnggota.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-semibold">{a.nama_lengkap}</div>
                    <div className="text-xs font-mono text-muted-foreground">{a.npm}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{a.divisi}</div>
                    <div className="text-xs text-muted-foreground">{a.jabatan || "-"}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {a.angkatan}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {a.no_hp || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={a.status === "aktif" ? "outline" : "destructive"}
                      className={
                        a.status === "aktif"
                          ? "border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 capitalize"
                          : "capitalize"
                      }
                    >
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setBarcodeAnggota(a)}
                        className="gap-1 text-xs"
                        title="Lihat & Unduh Barcode"
                      >
                        <Barcode className="size-3.5" />
                        <span className="hidden sm:inline">Barcode</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${a.nama_lengkap}`}
                        onClick={() => {
                          setErrorMessage(null);
                          setEditingAnggota(a);
                        }}
                        title="Edit data"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Hapus ${a.nama_lengkap}`}
                        disabled={isPending}
                        onClick={() => handleDelete(a)}
                        className="text-destructive hover:bg-destructive/10"
                        title="Hapus anggota"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Barcode Modal */}
      <BarcodeDialog
        anggota={barcodeAnggota}
        onClose={() => setBarcodeAnggota(null)}
      />

      {/* Import Excel Modal */}
      <ImportExcelDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImported={(summary) => setImportSuccess(summary)}
      />

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Anggota HIMA</DialogTitle>
            <DialogDescription>
              Isi data anggota secara lengkap. Barcode akan otomatis digenerate dari NPM.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              <AlertCircle className="size-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-3.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="npm">NPM</Label>
                <Input id="npm" name="npm" placeholder="Contoh: 211001001" required disabled={isPending} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="angkatan">Angkatan</Label>
                <Input id="angkatan" name="angkatan" placeholder="Contoh: 2023" required disabled={isPending} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
              <Input id="nama_lengkap" name="nama_lengkap" placeholder="Nama mahasiswa" required disabled={isPending} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="divisi">Divisi</Label>
                <Input id="divisi" name="divisi" placeholder="Contoh: BPH / PSDM" required disabled={isPending} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jabatan">Jabatan</Label>
                <Input id="jabatan" name="jabatan" placeholder="Ketua / Anggota" disabled={isPending} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="no_hp">No. WhatsApp/HP</Label>
                <Input id="no_hp" name="no_hp" placeholder="08xxxxxxxxxx" disabled={isPending} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <NativeSelect
                  id="status"
                  name="status"
                  defaultValue="aktif"
                  disabled={isPending}
                >
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </NativeSelect>
              </div>
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
      <Dialog open={!!editingAnggota} onOpenChange={(open) => !open && setEditingAnggota(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Anggota</DialogTitle>
            <DialogDescription>Perbarui data dan status anggota</DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              <AlertCircle className="size-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {editingAnggota && (
            <form onSubmit={handleUpdateSubmit} className="space-y-3.5 pt-1">
              <input type="hidden" name="id" value={editingAnggota.id} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_npm">NPM</Label>
                  <Input id="edit_npm" name="npm" defaultValue={editingAnggota.npm} required disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_angkatan">Angkatan</Label>
                  <Input id="edit_angkatan" name="angkatan" defaultValue={editingAnggota.angkatan} required disabled={isPending} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit_nama">Nama Lengkap</Label>
                <Input id="edit_nama" name="nama_lengkap" defaultValue={editingAnggota.nama_lengkap} required disabled={isPending} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_divisi">Divisi</Label>
                  <Input id="edit_divisi" name="divisi" defaultValue={editingAnggota.divisi} required disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_jabatan">Jabatan</Label>
                  <Input id="edit_jabatan" name="jabatan" defaultValue={editingAnggota.jabatan || ""} disabled={isPending} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_no_hp">No. WhatsApp/HP</Label>
                  <Input id="edit_no_hp" name="no_hp" defaultValue={editingAnggota.no_hp || ""} disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_status">Status</Label>
                  <NativeSelect
                    id="edit_status"
                    name="status"
                    defaultValue={editingAnggota.status}
                    disabled={isPending}
                  >
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                  </NativeSelect>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-900/10 pt-4 mt-2 dark:border-white/10">
                <Button type="button" variant="outline" onClick={() => setEditingAnggota(null)} disabled={isPending}>
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
