import { createServiceClient } from "@marketplace/supabase/service";
import type { NextRequest } from "next/server";

// Rotas chamadas pelo sistema do entregador (projeto Supabase separado),
// nunca por um usuário logado — por isso a autorização é uma chave
// compartilhada no header, não uma sessão Supabase.
export function assertBridgeSecret(req: NextRequest): boolean {
  return req.headers.get("x-bridge-secret") === process.env.DELIVERY_BRIDGE_SECRET;
}

// service_role: ignora RLS de propósito. Quem decide "pode ou não" aqui é o
// próprio código da rota (ex.: só aceita pedido `pending`), não a policy.
export function deliveryBridgeClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
