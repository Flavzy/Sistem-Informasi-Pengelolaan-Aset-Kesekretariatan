import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Parameters<typeof response.cookies.set>[2];
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Jika user terautentikasi, periksa data profil di tabel profiles
  let userRole: "admin" | "petugas" | null = null;
  let isActive = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (profile) {
      userRole = profile.role as "admin" | "petugas";
      isActive = profile.is_active;
    }
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isPetugasRoute = pathname.startsWith("/petugas");
  const isLoginPage = pathname === "/login";
  const isRootPage = pathname === "/";

  // 1. Proteksi route /admin/*
  if (isAdminRoute) {
    if (!user || !isActive) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (userRole !== "admin") {
      // Petugas tidak boleh akses /admin, alihkan ke /petugas
      return NextResponse.redirect(new URL("/petugas", request.url));
    }
  }

  // 2. Proteksi route /petugas/*
  if (isPetugasRoute) {
    if (!user || !isActive) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Baik admin maupun petugas aktif diperbolehkan ke /petugas
  }

  // 3. Jika user sudah login dan aktif mengakses /login atau /
  if ((isLoginPage || isRootPage) && user && isActive) {
    if (userRole === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    } else {
      return NextResponse.redirect(new URL("/petugas", request.url));
    }
  }

  // 4. Jika user membuka / dan belum login, arahkan ke /login
  if (isRootPage && (!user || !isActive)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Kecualikan file statis, gambar, favicon
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
