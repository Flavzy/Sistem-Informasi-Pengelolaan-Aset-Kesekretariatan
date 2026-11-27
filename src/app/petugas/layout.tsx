import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { QrCode } from "lucide-react";

export default async function PetugasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const displayName = profile?.nama_lengkap || user.email || "Petugas";

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* Mobile-friendly Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b bg-card shadow-sm">
        <div className="flex h-14 items-center justify-between px-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <QrCode className="size-4" />
            </div>
            <div>
              <span className="font-semibold text-sm">Petugas Presensi</span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2">
                ({displayName})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LogoutButton variant="ghost" size="sm" showText={false} />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
