/**
 * src/lib/supabase/server.ts
 * Supabase server client — digunakan di Server Components, Server Actions,
 * dan Route Handlers.
 *
 * Menggunakan @supabase/ssr dengan cookies() dari next/headers agar sesi
 * tersimpan/terbaca dari HTTP cookies secara server-side.
 *
 * PENTING: File ini hanya boleh di-import dari kode yang berjalan di server
 * (Server Components, Server Actions, Route Handlers, Middleware).
 * Jangan import dari Client Components ('use client').
 */

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

/**
 * Buat Supabase client untuk Server Components dan Server Actions.
 * Harus dipanggil sebagai async function karena `cookies()` adalah async
 * di Next.js 15+.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Partial<ResponseCookie> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll dipanggil dari Server Component — abaikan error ini.
            // Middleware akan menangani refresh sesi.
          }
        },
      },
    }
  ) as unknown as SupabaseClient<Database>;
}
