"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
  ShieldAlert,
} from "lucide-react";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginState | null, FormData>(
    loginAction,
    null
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section
      aria-labelledby="login-heading"
      className="relative z-10 w-full max-w-[400px] rounded-3xl border border-white/90 bg-gradient-to-b from-[#e4f2fe]/85 via-white/80 to-white/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8"
    >
      {/* Ikon utama dengan efek glass */}
      <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl border border-white bg-white/90 text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <LogIn className="size-5" aria-hidden="true" />
      </div>

      <header className="mb-6 text-center">
        <h1
          id="login-heading"
          className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
        >
          Masuk dengan Email
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Sistem Informasi Kesekretariatan HIMA. Gunakan akun dari Administrator.
        </p>
      </header>

      {state?.error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50/95 p-3 text-sm text-red-800"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-red-700" aria-hidden="true" />
          <p>{state.error}</p>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
            Email
          </Label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-600"
              aria-hidden="true"
            />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="nama@hima.org"
              required
              autoComplete="email"
              disabled={isPending}
              className="h-11 rounded-xl border-[#78879a] bg-slate-100/95 pl-10 text-slate-900 shadow-none placeholder:text-slate-600 focus-visible:border-slate-900 focus-visible:bg-white focus-visible:ring-slate-900/20 dark:bg-slate-100/95 dark:text-slate-900"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
            Password
          </Label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-600"
              aria-hidden="true"
            />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan password"
              required
              autoComplete="current-password"
              disabled={isPending}
              className="h-11 rounded-xl border-[#78879a] bg-slate-100/95 pl-10 pr-11 text-slate-900 shadow-none placeholder:text-slate-600 focus-visible:border-slate-900 focus-visible:bg-white focus-visible:ring-slate-900/20 dark:bg-slate-100/95 dark:text-slate-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isPending}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:pointer-events-none disabled:opacity-50"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="mt-2 h-11 w-full rounded-xl bg-gradient-to-b from-slate-800 to-slate-950 text-sm font-semibold text-white shadow-sm hover:from-slate-700 hover:to-slate-900 focus-visible:border-slate-900 focus-visible:ring-slate-900/35"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Memproses...
            </>
          ) : (
            "Masuk ke Sistem"
          )}
        </Button>
      </form>

      <footer className="mt-6 border-t border-slate-200/80 pt-4 text-center text-xs leading-relaxed text-slate-600">
        <p>Akses tertutup tanpa registrasi publik.</p>
        <p className="mt-0.5">
          Lupa password atau belum punya akun? Hubungi Administrator.
        </p>
      </footer>
    </section>
  );
}
