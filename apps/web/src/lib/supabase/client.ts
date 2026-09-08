import { createClient as createSupabaseBrowserClient } from "@marketplace/supabase/client";

// Singleton: cada chamada de createClient() nos componentes client é um
// clique/ação separada — sem isso, cada uma recriava o client (e o parsing
// da sessão do localStorage) do zero, um custo pequeno mas evitável somado
// em toda interação do site.
let browserClient: ReturnType<typeof createSupabaseBrowserClient> | null = null;

export function createClient() {
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
