import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

// Rutas públicas que NO requieren autenticación
const publicRoutes = ["/login", "/register"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Check if the current route is public (login/register)
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  console.log(
    `[MIDDLEWARE] Path: ${pathname}`,
    `| User: ${user?.email || "null"}`,
    `| User ID: ${user?.id || "null"}`,
    `| Error: ${error?.message || "none"}`,
    `| Public: ${isPublicRoute}`,
  );

  // Redirect unauthenticated users to login (except if already on public routes)
  if (!user && !isPublicRoute) {
    console.log(`Redirecting to /login from ${pathname} (no user)`);
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from login/register pages
  if (isPublicRoute && user) {
    const redirectUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect root to dashboard if authenticated, login if not
  if (pathname === "/") {
    const redirectUrl = new URL(user ? "/dashboard" : "/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
