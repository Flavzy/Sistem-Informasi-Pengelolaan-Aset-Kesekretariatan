import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActivityLogAction, EntityType, Json } from "@/types/database";

export interface LogParams {
  action: ActivityLogAction;
  entityType: EntityType;
  entityId?: string | null;
  description: string;
  details?: Record<string, unknown> | null;
  actorId?: string | null;
  actorRole?: string | null;
}

/**
 * Mencatat log aktivitas ke tabel `activity_logs`.
 * Fungsi ini dijalankan di server-side (Server Actions / Route Handlers).
 * Jika actorId/actorRole tidak disertakan, fungsi ini akan otomatis mengambil
 * data pengguna yang sedang aktif dari sesi Supabase.
 */
export async function recordActivityLog({
  action,
  entityType,
  entityId = null,
  description,
  details = null,
  actorId,
  actorRole,
}: LogParams): Promise<void> {
  try {
    let resolvedActorId = actorId;
    let resolvedActorRole = actorRole;

    // Jika actor belum disediakan, cari dari sesi saat ini
    if (!resolvedActorId) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        resolvedActorId = user.id;
        if (!resolvedActorRole) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
          resolvedActorRole = profile?.role ?? null;
        }
      }
    }

    // Gunakan admin client untuk menjamin penulisan audit log tidak terblokir
    const admin = createAdminClient();
    const { error } = await admin.from("activity_logs").insert({
      actor_id: resolvedActorId ?? null,
      actor_role: resolvedActorRole ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      description,
      details: details ? (details as unknown as Json) : null,
    });

    if (error) {
      console.error("Gagal mencatat log aktivitas:", error.message);
    }
  } catch (err) {
    console.error("Exception saat mencatat log aktivitas:", err);
  }
}
