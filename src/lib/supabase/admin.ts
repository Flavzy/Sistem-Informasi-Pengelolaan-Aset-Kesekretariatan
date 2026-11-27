/**
 * src/lib/supabase/admin.ts
 * Supabase Admin client — menggunakan SUPABASE_SERVICE_ROLE_KEY yang
 * meng-bypass Row Level Security (RLS).
 *
 * ⚠️ PERINGATAN KEAMANAN:
 * - File ini HANYA boleh di-import dari kode server-side:
 *   Server Actions, Route Handlers, atau script migrasi.
 * - JANGAN PERNAH kirim SUPABASE_SERVICE_ROLE_KEY ke browser.
 * - Gunakan hanya untuk operasi yang membutuhkan akses penuh:
 *   membuat akun petugas baru, menonaktifkan akun, atau operasi admin
 *   yang tidak bisa dilakukan dengan anon key.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Singleton admin client.
 * Aman di server karena tidak bocor ke browser.
 */
let adminClient: ReturnType<typeof createSupabaseClient<Database>> | null =
  null;

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY tidak ditemukan. " +
        "Pastikan variabel ini ada di .env.local dan hanya digunakan di server."
    );
  }

  if (!adminClient) {
    adminClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return adminClient;
}
