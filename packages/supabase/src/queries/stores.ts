import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type Client = SupabaseClient<Database>;

export const MAX_STORES_PER_OWNER = 15;

// TODO: remover essa extensão manual e os `as any` abaixo depois de rodar
// `supabase gen types` com a migration 0036_store_address.sql aplicada
// (esses campos ainda não existem no database.types.ts).
type StoreExtraFields = {
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export function listStoresByOwner(client: Client, ownerId: string) {
  return client
    .from("stores")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
}

export function getStoreById(client: Client, storeId: string) {
  return client.from("stores").select("*").eq("id", storeId).maybeSingle();
}

export function getStoreBySlug(client: Client, slug: string) {
  return client.from("stores").select("*").eq("slug", slug).maybeSingle();
}

export function isSlugTaken(client: Client, slug: string) {
  return client
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .maybeSingle()
    .then(({ data }) => !!data);
}

export function createStore(
  client: Client,
  store: Database["public"]["Tables"]["stores"]["Insert"] & StoreExtraFields
) {
  return (client.from("stores") as any).insert(store).select().single();
}

export function updateStore(
  client: Client,
  storeId: string,
  patch: Database["public"]["Tables"]["stores"]["Update"] & StoreExtraFields
) {
  return (client.from("stores") as any).update(patch).eq("id", storeId).select().single();
}

// Apaga a loja e, em cascata (FK), todos os produtos dela — se algum já
// tiver pedido vinculado (order_items é ON DELETE RESTRICT), o Postgres
// recusa a operação inteira e o erro sobe pra tela.
export function deleteStore(client: Client, storeId: string) {
  return client.from("stores").delete().eq("id", storeId);
}
