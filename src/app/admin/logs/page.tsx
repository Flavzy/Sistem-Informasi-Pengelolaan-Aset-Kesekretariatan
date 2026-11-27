import { createClient } from "@/lib/supabase/server";
import { LogsClient, type LogWithActor } from "./logs-client";
import type { ActivityLogRow, ProfileRow } from "@/types/database";

export const metadata = {
  title: "Log Aktivitas Sistem | Kesekretariatan HIMA",
};

export default async function AdminLogsPage() {
  const supabase = await createClient();

  // Ambil log aktivitas (hingga 300 data terbaru)
  const { data: rawLogs, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    console.error("Gagal memuat log aktivitas:", error.message);
  }

  const logs = (rawLogs as ActivityLogRow[]) || [];

  // Ambil nama actor
  const actorIds = Array.from(new Set(logs.map((l) => l.actor_id).filter(Boolean))) as string[];
  let actorMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nama_lengkap")
      .in("id", actorIds);
    if (profiles) {
      actorMap = new Map((profiles as ProfileRow[]).map((p) => [p.id, p.nama_lengkap]));
    }
  }

  const logsWithActor: LogWithActor[] = logs.map((log) => ({
    ...log,
    actor_name: log.actor_id ? actorMap.get(log.actor_id) || "Pengguna" : "Sistem",
  }));

  return <LogsClient initialLogs={logsWithActor} />;
}
