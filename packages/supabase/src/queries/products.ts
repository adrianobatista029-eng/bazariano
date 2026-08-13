import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type Client = SupabaseClient<Database>;

export function listActiveProducts(client: Client) {
  return client
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
}

export function getProductById(client: Client, productId: string) {
  return client.from("products").select("*").eq("id", productId).single();
}

export function listProductsBySeller(client: Client, sellerId: string) {
  return client
    .from("products")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
}

export function createProduct(
  client: Client,
  product: Database["public"]["Tables"]["products"]["Insert"]
) {
  return client.from("products").insert(product).select().single();
}

export function updateProduct(
  client: Client,
  productId: string,
  patch: Database["public"]["Tables"]["products"]["Update"]
) {
  return client.from("products").update(patch).eq("id", productId).select().single();
}
