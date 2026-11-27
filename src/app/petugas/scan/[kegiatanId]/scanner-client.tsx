"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { recordAbsensiAction } from "@/lib/actions/absensi";
import type { KegiatanRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Keyboard,
  Loader2,
  Users,
  ShieldAlert,
} from "lucide-react";

interface RecentAttendance {
  id: string;
  nama_lengkap: string;
  npm: string;
  divisi: string;
  waktu: string;
  metode: "scan" | "manual";
}

interface ScannerClientProps {
  kegiatan: KegiatanRow;
  initialAttendance: RecentAttendance[];
}

export function ScannerClient({
  kegiatan,
  initialAttendance,
}: ScannerClientProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInsecureContext, setIsInsecureContext] = useState(false);
  const [recentList, setRecentList] = useState<RecentAttendance[]>(initialAttendance);
  const [manualNpm, setManualNpm] = useState("");
  const [isPending, startTransition] = useTransition();

  // Scan feedback state
  const [feedback, setFeedback] = useState<{
    type: "success" | "duplicate" | "error";
    title: string;
    message: string;
  } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const readerId = "qr-reader-container";

  // Audio Beep generator
  const playBeep = (isSuccess: boolean) => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = isSuccess ? "sine" : "sawtooth";
      osc.frequency.setValueAtTime(isSuccess ? 880 : 330, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + (isSuccess ? 0.15 : 0.25));
    } catch {
      // Audio autoplay might be restricted by browser policy, ignore
    }
  };

  const handleProcessNpm = async (npm: string, metode: "scan" | "manual") => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const res = await recordAbsensiAction(kegiatan.id, npm, metode);

      if (res.success && res.anggota) {
        playBeep(true);
        setFeedback({
          type: "success",
          title: "Presensi Berhasil!",
          message: `${res.anggota.nama_lengkap} (${res.anggota.npm}) - ${res.anggota.divisi}`,
        });

        // Prepend to recent list
        setRecentList((prev) => [
          {
            id: res.anggota!.id + Date.now(),
            nama_lengkap: res.anggota!.nama_lengkap,
            npm: res.anggota!.npm,
            divisi: res.anggota!.divisi,
            waktu: new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            metode,
          },
          ...prev.slice(0, 9),
        ]);
        setManualNpm("");
      } else if (res.isDuplicate) {
        playBeep(false);
        setFeedback({
          type: "duplicate",
          title: "Sudah Pernah Absen",
          message: res.error || "Anggota ini telah tercatat hadir.",
        });
      } else {
        playBeep(false);
        setFeedback({
          type: "error",
          title: "Presensi Gagal",
          message: res.error || "NPM tidak ditemukan.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        title: "Kesalahan Sistem",
        message: "Gagal memproses presensi. Silakan coba lagi.",
      });
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1500);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsStartingCamera(true);

    // 1. Validasi Secure Context (HTTPS / localhost)
    if (typeof window !== "undefined") {
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (!window.isSecureContext && !isLocal) {
        setIsInsecureContext(true);
        setCameraError(
          `Browser HP memblokir kamera jika dibuka via HTTP (${window.location.hostname}). Browser mewajibkan HTTPS untuk akses kamera.`
        );
        setIsStartingCamera(false);
        setIsCameraActive(false);
        return;
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError(
          "Fitur kamera tidak tersedia di browser ini pada protokol saat ini (harus HTTPS)."
        );
        setIsStartingCamera(false);
        setIsCameraActive(false);
        return;
      }
    }

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
      }

      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      const scanConfig = {
        fps: 15,
        qrbox: { width: 260, height: 160 },
        aspectRatio: 1.0,
      };

      const onScanSuccess = (decodedText: string) => {
        const now = Date.now();
        if (now - lastScanTimeRef.current < 1500 || isProcessingRef.current) {
          return;
        }
        lastScanTimeRef.current = now;
        handleProcessNpm(decodedText.trim(), "scan");
      };

      try {
        // Coba kamera belakang HP
        await scannerRef.current.start(
          { facingMode: "environment" },
          scanConfig,
          onScanSuccess,
          () => {}
        );
      } catch (backCamErr) {
        console.warn("Gagal kamera belakang default, mencoba deteksi kamera...", backCamErr);
        // Fallback: cari ID kamera yang tersedia
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const rearCam =
            devices.find(
              (d) =>
                d.label.toLowerCase().includes("back") ||
                d.label.toLowerCase().includes("belakang") ||
                d.label.toLowerCase().includes("rear") ||
                d.label.toLowerCase().includes("environment")
            ) || devices[devices.length - 1];

          await scannerRef.current.start(
            rearCam.id,
            scanConfig,
            onScanSuccess,
            () => {}
          );
        } else {
          throw backCamErr;
        }
      }

      setIsCameraActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NotAllowedError") || msg.includes("Permission denied")) {
        setCameraError(
          "Izin kamera ditolak. Silakan berikan izin kamera pada ikon gembok/pengaturan di bar alamat browser HP Anda."
        );
      } else if (msg.includes("NotFoundError") || msg.includes("Requested device not found")) {
        setCameraError("Kamera tidak ditemukan pada perangkat ini.");
      } else if (msg.includes("NotReadableError") || msg.includes("Could not start video source")) {
        setCameraError("Kamera sedang digunakan oleh aplikasi lain di HP Anda.");
      } else {
        setCameraError(`Gagal membuka kamera: ${msg}`);
      }
      setIsCameraActive(false);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsCameraActive(false);
      } catch (err) {
        console.error("Gagal mematikan kamera:", err);
      }
    }
  };

  useEffect(() => {
    // Jalankan deteksi kamera saat halaman dimuat
    startCamera();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNpm.trim()) return;
    startTransition(() => {
      handleProcessNpm(manualNpm.trim(), "manual");
    });
  };

  return (
    <div className="space-y-4 max-w-md mx-auto pb-8">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <Link href="/petugas">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="size-4" />
            <span>Kembali</span>
          </Button>
        </Link>
        <div className="text-right">
          <span className="text-xs text-muted-foreground block truncate max-w-[180px]">
            {kegiatan.nama_kegiatan}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              isCameraActive
                ? "border-emerald-500 text-emerald-600 bg-emerald-50"
                : "border-muted text-muted-foreground"
            }`}
          >
            {isCameraActive ? "Scanner Aktif" : "Scanner Siap"}
          </Badge>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-sm transition-all duration-200 flex items-start gap-3 shadow-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-900 dark:text-emerald-200"
              : feedback.type === "duplicate"
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500/40 text-amber-900 dark:text-amber-200"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : feedback.type === "duplicate" ? (
            <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-bold text-sm leading-tight">{feedback.title}</p>
            <p className="text-xs mt-0.5 opacity-90">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Camera Box */}
      <Card className="overflow-hidden border-2 border-border shadow-sm">
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[260px]">
          <div id={readerId} className="w-full" />

          {/* Camera toggle button in corner */}
          <div className="absolute top-2 right-2 z-20">
            {isCameraActive ? (
              <Button
                variant="secondary"
                size="xs"
                onClick={stopCamera}
                className="gap-1 text-xs bg-black/75 text-white hover:bg-black/90 border-0"
              >
                <CameraOff className="size-3.5" />
                Matikan
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="xs"
                onClick={startCamera}
                disabled={isStartingCamera}
                className="gap-1 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {isStartingCamera ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
                Nyalakan
              </Button>
            )}
          </div>

          {!isCameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-slate-900">
              {isInsecureContext ? (
                <ShieldAlert className="size-10 text-amber-400 mb-2" />
              ) : (
                <Camera className="size-10 text-muted-foreground mb-2" />
              )}
              <p className="text-sm font-semibold">
                {isInsecureContext ? "Kamera Membutuhkan HTTPS" : "Kamera Sedang Nonaktif"}
              </p>
              {cameraError ? (
                <p className="text-xs text-rose-300 bg-rose-950/60 p-2.5 rounded-lg border border-rose-800/40 mt-2 max-w-xs leading-relaxed">
                  {cameraError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Tekan tombol di bawah untuk meminta izin akses kamera ke browser HP Anda.
                </p>
              )}
              <Button
                onClick={startCamera}
                disabled={isStartingCamera}
                size="sm"
                className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isStartingCamera ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Meminta Izin Kamera...
                  </>
                ) : (
                  <>
                    <Camera className="size-4" />
                    Buka Kamera Sekarang
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        <div className="p-2.5 bg-muted/40 text-center text-[11px] text-muted-foreground border-t">
          Arahkan barcode NPM ke dalam area kotak pemindai
        </div>
      </Card>

      {/* Manual Input Fallback */}
      <Card>
        <CardContent className="p-3.5">
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Keyboard className="size-3.5 text-primary" />
              <span>Input NPM Manual (Jika Kamera Tidak Aktif / Barcode Rusak)</span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Masukkan NPM (contoh: 211001001)"
                value={manualNpm}
                onChange={(e) => setManualNpm(e.target.value)}
                disabled={isPending}
                className="font-mono text-sm"
              />
              <Button
                type="submit"
                disabled={isPending || !manualNpm.trim()}
                size="default"
                className="shrink-0 bg-primary"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : "Hadir"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Attendance List */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 text-primary" />
            <span>Presensi Terbaru Sesi Ini</span>
          </div>
          <span className="font-mono">{recentList.length} hadir</span>
        </div>

        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {recentList.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              Belum ada kehadiran tercatat. Mulai scan barcode atau ketik NPM di atas.
            </div>
          ) : (
            recentList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-xs"
              >
                <div>
                  <p className="font-semibold text-foreground">{item.nama_lengkap}</p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {item.npm} • {item.divisi}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-[11px] block">{item.waktu}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">
                    {item.metode}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
