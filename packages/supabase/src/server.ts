import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import type { Database } from "./database.types";

// Recebe os cookies do Next.js (server component / route handler / middleware)
// para não acoplar este pacote diretamente a `next/headers`.
export function createClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  cookies: CookieMethodsServer
) {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies,
  });
}
