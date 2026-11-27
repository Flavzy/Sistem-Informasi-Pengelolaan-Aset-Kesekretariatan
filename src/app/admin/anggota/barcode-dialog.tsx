"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import JsBarcode from "jsbarcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, AlertCircle } from "lucide-react";
import type { AnggotaRow } from "@/types/database";

interface BarcodeDialogProps {
  anggota: AnggotaRow | null;
  onClose: () => void;
}

export function BarcodeDialog({ anggota, onClose }: BarcodeDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const drawBarcode = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas || !anggota) return;
      canvasRef.current = canvas;
      setError(null);

      try {
        const npmValue = String(anggota.npm).trim();
        if (!npmValue) {
          setError("NPM anggota tidak valid atau kosong.");
          return;
        }

        JsBarcode(canvas, npmValue, {
          format: "CODE128",
          lineColor: "#000000",
          width: 2.2,
          height: 80,
          displayValue: true,
          font: "monospace",
          fontSize: 16,
          textMargin: 8,
          background: "#ffffff",
          margin: 10,
        });
      } catch (err: unknown) {
        console.error("Gagal membuat barcode:", err);
        setError("Gagal menghasilkan barcode CODE128 untuk NPM ini.");
      }
    },
    [anggota]
  );

  // Fallback trigger jika portal dialog butuh waktu mounting
  useEffect(() => {
    if (anggota) {
      const timer = setTimeout(() => {
        if (canvasRef.current) {
          drawBarcode(canvasRef.current);
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [anggota, drawBarcode]);

  const handleDownload = () => {
    if (!canvasRef.current || !anggota) return;
    try {
      const url = canvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      const safeName = anggota.nama_lengkap.replace(/\s+/g, "_");
      link.href = url;
      link.download = `Barcode_${anggota.npm}_${safeName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Gagal mengunduh barcode:", err);
    }
  };

  const handlePrint = () => {
    if (!canvasRef.current || !anggota) return;
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        window.print();
        return;
      }
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Kartu Barcode - ${anggota.nama_lengkap} (${anggota.npm})</title>
            <style>
              @page { size: auto; margin: 10mm; }
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 80vh;
                margin: 0;
                color: #111;
              }
              .card {
                border: 2px solid #222;
                border-radius: 12px;
                padding: 24px 32px;
                text-align: center;
                width: 320px;
                background: #fff;
              }
              .title {
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: #555;
              }
              .org {
                font-size: 15px;
                font-weight: 800;
                margin-top: 2px;
                margin-bottom: 12px;
              }
              img {
                max-width: 100%;
                height: auto;
                margin: 6px 0;
              }
              .name {
                font-size: 17px;
                font-weight: 700;
                margin-top: 10px;
              }
              .meta {
                font-size: 13px;
                color: #444;
                margin-top: 3px;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="title">Kartu Presensi Anggota</div>
              <div class="org">HIMA - Kesekretariatan</div>
              <img src="${dataUrl}" alt="Barcode ${anggota.npm}" />
              <div class="name">${anggota.nama_lengkap}</div>
              <div class="meta">NPM: ${anggota.npm} • ${anggota.divisi}</div>
              <div class="meta">Angkatan ${anggota.angkatan}</div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error("Gagal mencetak barcode:", err);
    }
  };

  return (
    <Dialog open={!!anggota} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md text-center">
        <DialogHeader>
          <DialogTitle>Barcode Presensi Anggota</DialogTitle>
          <DialogDescription>
            Barcode NPM berformat CODE128 untuk pemindaian scanner presensi
          </DialogDescription>
        </DialogHeader>

        {anggota && (
          <div className="flex flex-col items-center gap-4 py-4">
            {error ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 w-full text-left">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {/* Canvas Barcode dengan Callback Ref */}
            <div className="rounded-xl border bg-white p-4 shadow-sm flex items-center justify-center min-h-[120px] w-full">
              <canvas ref={drawBarcode} className="max-w-full" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold text-base">{anggota.nama_lengkap}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                NPM: <span className="font-mono font-bold text-foreground">{anggota.npm}</span> • {anggota.divisi} ({anggota.angkatan})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full pt-1">
              <Button onClick={handleDownload} variant="default" className="gap-2">
                <Download className="size-4" />
                Unduh PNG
              </Button>
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <Printer className="size-4" />
                Cetak Barcode
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
