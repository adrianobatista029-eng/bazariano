import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Cliente com a service_role key: ignora RLS de propósito. Só deve ser
// usado em código de servidor que já faz sua própria checagem de
// autorização (ex.: as rotas /api/deliveries/* chamadas pelo sistema do
// entregador via segredo compartilhado) — nunca num Server/Client Component
// que atende usuário final direto.
export function createServiceClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient<Database>(supabaseUrl, serviceRoleKey);
}
