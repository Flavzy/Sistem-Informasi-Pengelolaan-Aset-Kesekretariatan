"use client";

import { useState, useTransition, useMemo } from "react";
import {
  createInventarisAction,
  updateInventarisAction,
  deleteInventarisAction,
} from "@/lib/actions/inventaris";
import type { InventarisRow, InventarisKondisi } from "@/types/database";
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
  PackagePlus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  Package,
} from "lucide-react";

interface InventarisClientProps {
  initialInventaris: InventarisRow[];
}

const kondisiLabels: Record<InventarisKondisi, string> = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_berat: "Rusak Berat",
  hilang: "Hilang",
};

const kondisiBadgeStyles: Record<InventarisKondisi, string> = {
  baik: "border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
  rusak_ringan: "border-amber-500/30 text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  rusak_berat: "border-rose-500/30 text-rose-600 bg-rose-50 dark:bg-rose-950/30",
  hilang: "border-red-500/30 text-red-600 bg-red-50 dark:bg-red-950/30",
};

export function InventarisClient({ initialInventaris }: InventarisClientProps) {
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState<string>("ALL");
  const [filterKondisi, setFilterKondisi] = useState<string>("ALL");

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventarisRow | null>(null);

  const kategoriList = useMemo(() => {
    const set = new Set(initialInventaris.map((i) => i.kategori).filter(Boolean));
    return Array.from(set).sort();
  }, [initialInventaris]);

  const filteredItems = initialInventaris.filter((i) => {
    const matchSearch =
      i.nama_barang.toLowerCase().includes(search.toLowerCase()) ||
      i.kode_barang.toLowerCase().includes(search.toLowerCase()) ||
      (i.lokasi_simpan && i.lokasi_simpan.toLowerCase().includes(search.toLowerCase()));
    const matchKategori = filterKategori === "ALL" || i.kategori === filterKategori;
    const matchKondisi = filterKondisi === "ALL" || i.kondisi === filterKondisi;
    return matchSearch && matchKategori && matchKondisi;
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createInventarisAction(formData);
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
      const res = await updateInventarisAction(formData);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setEditingItem(null);
      }
    });
  };

  const handleDelete = (item: InventarisRow) => {
    if (!confirm(`Hapus barang ${item.nama_barang} (${item.kode_barang})?`)) return;

    startTransition(async () => {
      const res = await deleteInventarisAction(item.id, item.nama_barang, item.kode_barang);
      if (res.error) {
        alert(res.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-1 lg:min-h-0">
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventaris Sekretariat</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data barang, aset, kondisi fisik, dan lokasi penyimpanan sekretariat.
          </p>
        </div>
        <Button
          onClick={() => {
            setErrorMessage(null);
            setIsCreateOpen(true);
          }}
          className="gap-2 shrink-0"
        >
          <PackagePlus className="size-4" />
          Tambah Barang
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari Kode, Nama, atau Lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <NativeSelect
          aria-label="Filter kategori barang"
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
        >
          <option value="ALL">Semua Kategori</option>
          {kategoriList.map((k) => (
            <option key={k} value={k}>
              Kategori: {k}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Filter kondisi barang"
          value={filterKondisi}
          onChange={(e) => setFilterKondisi(e.target.value)}
        >
          <option value="ALL">Semua Kondisi</option>
          <option value="baik">Kondisi: Baik</option>
          <option value="rusak_ringan">Kondisi: Rusak Ringan</option>
          <option value="rusak_berat">Kondisi: Rusak Berat</option>
          <option value="hilang">Kondisi: Hilang</option>
        </NativeSelect>
      </div>

      {/* Table */}
      <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0 lg:flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Barang</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-center">Jumlah</TableHead>
              <TableHead>Kondisi</TableHead>
              <TableHead className="hidden md:table-cell">Lokasi Simpan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Tidak ada barang inventaris yang sesuai.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-semibold flex items-center gap-2">
                      <Package className="size-4 text-muted-foreground shrink-0" />
                      <span>{item.nama_barang}</span>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground ml-6">
                      {item.kode_barang}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{item.kategori}</span>
                  </TableCell>
                  <TableCell className="text-center font-semibold text-sm">
                    {item.jumlah}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={kondisiBadgeStyles[item.kondisi]}
                    >
                      {kondisiLabels[item.kondisi]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {item.lokasi_simpan || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${item.nama_barang}`}
                        onClick={() => {
                          setErrorMessage(null);
                          setEditingItem(item);
                        }}
                        title="Edit barang"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Hapus ${item.nama_barang}`}
                        disabled={isPending}
                        onClick={() => handleDelete(item)}
                        className="text-destructive hover:bg-destructive/10"
                        title="Hapus barang"
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Inventaris Barang</DialogTitle>
            <DialogDescription>
              Catat data aset dan barang inventaris sekretariat baru.
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
                <Label htmlFor="kode_barang">Kode Barang</Label>
                <Input id="kode_barang" name="kode_barang" placeholder="INV-001" required disabled={isPending} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kategori">Kategori</Label>
                <Input id="kategori" name="kategori" placeholder="Elektronik / ATK" required disabled={isPending} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nama_barang">Nama Barang</Label>
              <Input id="nama_barang" name="nama_barang" placeholder="Contoh: Proyektor Epson" required disabled={isPending} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="jumlah">Jumlah Unit</Label>
                <Input id="jumlah" name="jumlah" type="number" min={0} defaultValue={1} required disabled={isPending} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kondisi">Kondisi Fisik</Label>
                <NativeSelect
                  id="kondisi"
                  name="kondisi"
                  defaultValue="baik"
                  disabled={isPending}
                >
                  <option value="baik">Baik</option>
                  <option value="rusak_ringan">Rusak Ringan</option>
                  <option value="rusak_berat">Rusak Berat</option>
                  <option value="hilang">Hilang</option>
                </NativeSelect>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lokasi_simpan">Lokasi Penyimpanan</Label>
              <Input id="lokasi_simpan" name="lokasi_simpan" placeholder="Lemari A / Rak 2" disabled={isPending} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catatan">Catatan Tambahan (Opsional)</Label>
              <Input id="catatan" name="catatan" placeholder="Kelengkapan kabel, dll" disabled={isPending} />
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
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Barang</DialogTitle>
            <DialogDescription>Perbarui informasi barang inventaris</DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              <AlertCircle className="size-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {editingItem && (
            <form onSubmit={handleUpdateSubmit} className="space-y-3.5 pt-1">
              <input type="hidden" name="id" value={editingItem.id} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_kode">Kode Barang</Label>
                  <Input id="edit_kode" name="kode_barang" defaultValue={editingItem.kode_barang} required disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_kategori">Kategori</Label>
                  <Input id="edit_kategori" name="kategori" defaultValue={editingItem.kategori} required disabled={isPending} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit_nama">Nama Barang</Label>
                <Input id="edit_nama" name="nama_barang" defaultValue={editingItem.nama_barang} required disabled={isPending} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_jumlah">Jumlah Unit</Label>
                  <Input id="edit_jumlah" name="jumlah" type="number" min={0} defaultValue={editingItem.jumlah} required disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_kondisi">Kondisi Fisik</Label>
                  <NativeSelect
                    id="edit_kondisi"
                    name="kondisi"
                    defaultValue={editingItem.kondisi}
                    disabled={isPending}
                  >
                    <option value="baik">Baik</option>
                    <option value="rusak_ringan">Rusak Ringan</option>
                    <option value="rusak_berat">Rusak Berat</option>
                    <option value="hilang">Hilang</option>
                  </NativeSelect>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit_lokasi">Lokasi Penyimpanan</Label>
                <Input id="edit_lokasi" name="lokasi_simpan" defaultValue={editingItem.lokasi_simpan || ""} disabled={isPending} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit_catatan">Catatan</Label>
                <Input id="edit_catatan" name="catatan" defaultValue={editingItem.catatan || ""} disabled={isPending} />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-900/10 pt-4 mt-2 dark:border-white/10">
                <Button type="button" variant="outline" onClick={() => setEditingItem(null)} disabled={isPending}>
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
