import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type Client = SupabaseClient<Database>;

export type ProductCondition = "novo" | "seminovo" | "usado_bom" | "usado_reparo";
export type PackageSize = "pequeno" | "medio" | "grande";
export type ListingType = "produto" | "servico" | "aluguel" | "venda_imovel";

// TODO: remover essa extensão manual e os `as any` abaixo depois de rodar
// `supabase gen types` com as migrations 0009_condition_delivery_location.sql,
// 0012_categories.sql e 0013_listing_type.sql aplicadas (esses campos ainda
// não existem no database.types.ts).
type ProductExtraFields = {
  condition?: ProductCondition;
  allow_pickup?: boolean;
  allow_delivery?: boolean;
  allow_seller_delivery?: boolean;
  category_id?: string | null;
  subcategory_id?: string | null;
  package_size?: PackageSize;
  listing_type?: ListingType;
  contact_phone?: string | null;
};

export function listActiveProducts(client: Client) {
  return client
    .from("products")
    .select("*, product_media(*)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .order("position", { foreignTable: "product_media", ascending: true });
}

export function getProductById(client: Client, productId: string) {
  return client
    .from("products")
    .select("*, product_media(*)")
    .eq("id", productId)
    .order("position", { foreignTable: "product_media", ascending: true })
    .single();
}

export function listProductsBySeller(client: Client, sellerId: string) {
  return client
    .from("products")
    .select("*, product_media(*)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .order("position", { foreignTable: "product_media", ascending: true });
}

export function createProduct(
  client: Client,
  product: Database["public"]["Tables"]["products"]["Insert"] & ProductExtraFields
) {
  return (client.from("products") as any).insert(product).select().single();
}

export function updateProduct(
  client: Client,
  productId: string,
  patch: Database["public"]["Tables"]["products"]["Update"] & ProductExtraFields
) {
  return (client.from("products") as any).update(patch).eq("id", productId).select().single();
}
