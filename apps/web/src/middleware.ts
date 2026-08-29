import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseServerClient } from "@marketplace/supabase/server";

const PROTECTED_PREFIXES = ["/pedidos", "/vendas", "/vender"];
const ADMIN_PREFIX = "/admin";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  let profile: { role: string; full_name: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  // Conta "apagada": em vez de uma coluna dedicada, usamos o próprio
  // full_name como sinal (evita migration) — handleDeleteAccount grava
  // esse valor exato ao anonimizar o perfil.
  if (user && pathname !== "/login" && profile?.full_name === "Usuário removido") {
    await supabase.auth.signOut();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("accountDeleted", "1");
    return NextResponse.redirect(loginUrl);
  }

  if ((isProtected || isAdminRoute) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && user && profile?.role !== "admin") {
    return NextResponse.redirect(new URL("/produtos", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
