"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Mail, Loader2, ShieldAlert } from "lucide-react";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginState | null, FormData>(
    loginAction,
    null
  );

  return (
    <Card className="w-full max-w-md shadow-lg border-border">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Lock className="size-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Kesekretariatan HIMA
        </CardTitle>
        <CardDescription>
          Masukkan email dan password untuk masuk ke sistem
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state?.error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
            <ShieldAlert className="size-4 shrink-0" />
            <p>{state.error}</p>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nama@hima.org"
                required
                autoComplete="email"
                className="pl-9"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="pl-9"
                disabled={isPending}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Memproses...
              </>
            ) : (
              "Masuk"
            )}
          </Button>
        </form>

        <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
          <p>Sistem ini bersifat tertutup tanpa registrasi publik.</p>
          <p className="mt-1">
            Akun petugas hanya dapat dibuat langsung oleh Administrator.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
