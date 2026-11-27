"use client";

import { useState, useTransition } from "react";
import { importPanitiaAction } from "@/lib/actions/panitia";
import {
  downloadPanitiaTemplateExcel,
  parsePanitiaSheetRows,
  type PanitiaImportInput,
} from "@/lib/panitia-excel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";

interface ImportPanitiaDialogProps {
  kegiatanId: string;
  namaKegiatan: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (summary: string) => void;
}

export function ImportPanitiaDialog({
  kegiatanId,
  namaKegiatan,
  open,
  onOpenChange,
  onImported,
}: ImportPanitiaDialogProps) {
  const [parsedRows, setParsedRows] = useState<PanitiaImportInput[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const resetState = () => {
    setParsedRows([]);
    setErrors([]);
    setFileName("");
    setIsParsing(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    resetState();
    if (!file) return;

    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setErrors(["Format file harus .xlsx (Microsoft Excel)."]);
      return;
    }

    setIsParsing(true);
    try {
      const { readSheet } = await import("read-excel-file/browser");
      const rawRows = await readSheet(file);
      const result = parsePanitiaSheetRows(rawRows);
      setParsedRows(result.rows);
      setErrors(result.errors);
    } catch {
      setErrors([
        "Gagal membaca file Excel. Pastikan file .xlsx tidak rusak atau terproteksi password.",
      ]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportSubmit = () => {
    if (parsedRows.length === 0 || errors.length > 0) return;

    startTransition(async () => {
      const res = await importPanitiaAction(kegiatanId, parsedRows);
      if (res.error) {
        setErrors([res.error]);
        return;
      }

      const summary = `Berhasil mengimpor ${res.total} panitia (${res.createdCount} baru, ${res.updatedCount} diperbarui).`;
      resetState();
      onOpenChange(false);
      onImported(summary);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-emerald-600" />
            <span>Import Panitia Kegiatan (Excel)</span>
          </DialogTitle>
          <DialogDescription>
            Unggah file Excel (.xlsx) daftar panitia untuk{" "}
            <strong className="text-foreground">{namaKegiatan}</strong>. NPM yang sudah ada pada kegiatan ini akan diperbarui otomatis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-white/75 dark:bg-zinc-900/60 p-3 text-xs">
            <span className="text-muted-foreground">
              Kolom wajib: <strong>NPM, Nama, Jabatan, Divisi</strong>
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => downloadPanitiaTemplateExcel()}
              className="gap-1.5 shrink-0"
            >
              <Download className="size-3.5" />
              Template .xlsx
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="panitia_excel_file">Pilih File Excel (.xlsx)</Label>
            <Input
              id="panitia_excel_file"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              disabled={isParsing || isPending}
              className="cursor-pointer"
            />
            {fileName && (
              <p className="text-xs text-muted-foreground">File dipilih: {fileName}</p>
            )}
          </div>

          {isParsing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Membaca dan memvalidasi isi Excel...</span>
            </div>
          )}

          {errors.length > 0 && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="size-4 shrink-0" />
                <span>Ditemukan {errors.length} kesalahan:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {errors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
              {errors.length > 5 && (
                <p className="pl-5 italic">...dan {errors.length - 5} kesalahan lainnya.</p>
              )}
            </div>
          )}

          {parsedRows.length > 0 && errors.length === 0 && (
            <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Siap mengimpor {parsedRows.length} data panitia</span>
              </div>
              <div className="max-h-40 overflow-y-auto rounded border bg-background text-xs">
                <table className="w-full text-left">
                  <thead className="border-b bg-muted/50 text-[11px] text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1">NPM</th>
                      <th className="px-2 py-1">Nama</th>
                      <th className="px-2 py-1">Jabatan</th>
                      <th className="px-2 py-1">Divisi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedRows.slice(0, 5).map((r) => (
                      <tr key={r.npm}>
                        <td className="px-2 py-1 font-mono">{r.npm}</td>
                        <td className="px-2 py-1">{r.nama_lengkap}</td>
                        <td className="px-2 py-1">{r.jabatan}</td>
                        <td className="px-2 py-1">{r.divisi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 5 && (
                  <p className="border-t px-2 py-1 text-[11px] text-muted-foreground">
                    +{parsedRows.length - 5} data lainnya...
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-900/10 pt-4 mt-2 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleImportSubmit}
              disabled={parsedRows.length === 0 || errors.length > 0 || isParsing || isPending}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Impor {parsedRows.length > 0 ? `${parsedRows.length} Panitia` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
