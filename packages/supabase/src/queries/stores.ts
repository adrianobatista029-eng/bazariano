import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type Client = SupabaseClient<Database>;

export const MAX_STORES_PER_OWNER = 15;

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
  store: Database["public"]["Tables"]["stores"]["Insert"]
) {
  return client.from("stores").insert(store).select().single();
}

export function updateStore(
  client: Client,
  storeId: string,
  patch: Database["public"]["Tables"]["stores"]["Update"]
) {
  return client.from("stores").update(patch).eq("id", storeId).select().single();
}
