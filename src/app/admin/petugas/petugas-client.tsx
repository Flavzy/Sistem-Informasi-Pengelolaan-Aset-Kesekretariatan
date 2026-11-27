"use client";

import { useState, useTransition } from "react";
import {
  createPetugasAction,
  updatePetugasAction,
  togglePetugasStatusAction,
} from "@/lib/actions/petugas";
import type { ProfileRow } from "@/types/database";
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
  UserPlus,
  Pencil,
  Power,
  Search,
  Shield,
  User,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface PetugasClientProps {
  initialProfiles: ProfileRow[];
  currentUserId: string;
}

export function PetugasClient({
  initialProfiles,
  currentUserId,
}: PetugasClientProps) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileRow | null>(null);

  const filteredProfiles = initialProfiles.filter(
    (p) =>
      p.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createPetugasAction(formData);
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
      const res = await updatePetugasAction(formData);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setEditingProfile(null);
      }
    });
  };

  const handleToggleStatus = (profile: ProfileRow) => {
    if (profile.id === currentUserId) {
      alert("Anda tidak dapat menonaktifkan akun Anda sendiri!");
      return;
    }

    const actionText = profile.is_active ? "menonaktifkan" : "mengaktifkan";
    if (!confirm(`Apakah Anda yakin ingin ${actionText} akun ${profile.nama_lengkap}?`)) {
      return;
    }

    startTransition(async () => {
      const res = await togglePetugasStatusAction(
        profile.id,
        profile.is_active,
        profile.nama_lengkap
      );
      if (res.error) {
        alert(res.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-1 lg:min-h-0">
      {/* Top Bar */}
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Petugas & Admin</h1>
          <p className="text-sm text-muted-foreground">
            Kelola hak akses dan akun operasional kesekretariatan.
          </p>
        </div>
        <Button
          onClick={() => {
            setErrorMessage(null);
            setIsCreateOpen(true);
          }}
          className="gap-2 shrink-0"
        >
          <UserPlus className="size-4" />
          Tambah Petugas / Admin
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Profiles Table */}
      <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0 lg:flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pengguna</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Dibuat Pada</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProfiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Tidak ada data pengguna yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredProfiles.map((p) => {
                const isSelf = p.id === currentUserId;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {p.nama_lengkap} {isSelf && <span className="text-xs text-muted-foreground">(Anda)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.role === "admin" ? "default" : "secondary"}
                        className="gap-1 capitalize"
                      >
                        {p.role === "admin" ? (
                          <Shield className="size-3" />
                        ) : (
                          <User className="size-3" />
                        )}
                        {p.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.is_active ? "outline" : "destructive"}
                        className={
                          p.is_active
                            ? "border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                            : ""
                        }
                      >
                        {p.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${p.nama_lengkap}`}
                          onClick={() => {
                            setErrorMessage(null);
                            setEditingProfile(p);
                          }}
                          title="Edit nama / role"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={p.is_active ? `Nonaktifkan ${p.nama_lengkap}` : `Aktifkan ${p.nama_lengkap}`}
                          disabled={isSelf || isPending}
                          onClick={() => handleToggleStatus(p)}
                          className={
                            p.is_active
                              ? "text-destructive hover:bg-destructive/10"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }
                          title={
                            isSelf
                              ? "Tidak bisa menonaktifkan diri sendiri"
                              : p.is_active
                              ? "Nonaktifkan akun"
                              : "Aktifkan akun"
                          }
                        >
                          <Power className="size-3.5" aria-hidden="true" />
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
            <DialogTitle>Tambah Akun Baru</DialogTitle>
            <DialogDescription>
              Buat akun admin atau petugas baru. Kredensial akan langsung aktif untuk login.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              <AlertCircle className="size-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
              <Input
                id="nama_lengkap"
                name="nama_lengkap"
                placeholder="Contoh: Ahmad Fauzi"
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="fauzi@hima.org"
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">Role Akses</Label>
              <NativeSelect
                id="role"
                name="role"
                defaultValue="petugas"
                disabled={isPending}
              >
                <option value="petugas">Petugas (Akses Scanner Presensi)</option>
                <option value="admin">Admin (Akses Penuh Kesekretariatan)</option>
              </NativeSelect>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-900/10 pt-4 mt-2 dark:border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                Simpan Akun
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingProfile}
        onOpenChange={(open) => !open && setEditingProfile(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Pengguna</DialogTitle>
            <DialogDescription>
              Perbarui nama lengkap dan tingkat akses peran.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              <AlertCircle className="size-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {editingProfile && (
            <form onSubmit={handleUpdateSubmit} className="space-y-4 pt-2">
              <input type="hidden" name="id" value={editingProfile.id} />

              <div className="space-y-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  value={editingProfile.email}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground">
                  Email akun tidak dapat diubah setelah dibuat.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_nama">Nama Lengkap</Label>
                <Input
                  id="edit_nama"
                  name="nama_lengkap"
                  defaultValue={editingProfile.nama_lengkap}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit_role">Role Akses</Label>
                <NativeSelect
                  id="edit_role"
                  name="role"
                  defaultValue={editingProfile.role}
                  disabled={isPending}
                >
                  <option value="petugas">Petugas</option>
                  <option value="admin">Admin</option>
                </NativeSelect>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-900/10 pt-4 mt-2 dark:border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProfile(null)}
                  disabled={isPending}
                >
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
