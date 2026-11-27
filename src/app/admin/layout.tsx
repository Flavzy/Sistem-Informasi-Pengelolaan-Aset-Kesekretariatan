import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminLayout({
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

  const currentUser = {
    nama_lengkap: profile?.nama_lengkap || user.email || "Admin",
    email: user.email || "",
    role: profile?.role || "admin",
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:h-dvh lg:flex-row lg:overflow-hidden">
      <AdminSidebar user={currentUser} />
      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 sm:p-6 lg:min-h-0 lg:overflow-y-auto lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
