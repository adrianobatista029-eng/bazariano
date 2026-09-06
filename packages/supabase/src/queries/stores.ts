import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type Client = SupabaseClient<Database>;

export function getStoreByOwnerId(client: Client, ownerId: string) {
  return client.from("stores").select("*").eq("id", ownerId).maybeSingle();
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
  ownerId: string,
  patch: Database["public"]["Tables"]["stores"]["Update"]
) {
  return client.from("stores").update(patch).eq("id", ownerId).select().single();
}
