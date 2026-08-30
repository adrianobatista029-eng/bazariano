import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { productMediaPathFromUrl } from "./product-media";

type Client = SupabaseClient<Database>;

export type ProductCondition = "novo" | "seminovo" | "usado_bom" | "usado_reparo";
export type PackageSize = "pequeno" | "medio" | "grande";
export type ListingType = "produto" | "servico" | "aluguel" | "venda_imovel";

// TODO: remover essa extensão manual e os `as any` abaixo depois de rodar
// `supabase gen types` com as migrations 0009_condition_delivery_location.sql,
// 0012_categories.sql, 0013_listing_type.sql e 0018_product_address.sql
// aplicadas (esses campos ainda não existem no database.types.ts).
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
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
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

// Ajusta o estoque via a função `reserve_product_stock` (migration
// 0017_reserve_product_stock.sql) — atômico no banco (uma única instrução
// SQL) e roda como SECURITY DEFINER, já que o comprador não tem (e não deve
// ter) permissão de UPDATE na linha do produto de outro vendedor. `delta`
// negativo reserva estoque (falha se não tiver o suficiente); positivo
// devolve (usado quando um pedido não é concluído).
export async function adjustProductStock(client: Client, productId: string, delta: number) {
  const { data, error } = await (client.rpc as any)("reserve_product_stock", {
    p_product_id: productId,
    p_delta: delta,
  });

  if (error) {
    if (error.message?.includes("estoque insuficiente")) {
      return { ok: false as const, error: "Estoque insuficiente pra essa quantidade." };
    }
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, remainingStock: data as number };
}

// Apaga o anúncio de verdade (linha da tabela + mídia no Storage), não só
// muda o status. product_media, stories e trade_offers têm `on delete
// cascade`, mas `order_items.product_id` é `on delete restrict` — se o
// anúncio já teve pedido, o delete falha (código 23503) e devolvemos
// `blocked: true` pra quem chamou decidir o que fazer (hoje: cai pro
// soft-delete de sempre, status = "removed").
export async function deleteProductCompletely(client: Client, productId: string) {
  const { data: media } = await client
    .from("product_media")
    .select("url")
    .eq("product_id", productId);

  const paths = (media ?? [])
    .map((m) => productMediaPathFromUrl(m.url))
    .filter((p): p is string => !!p);
  if (paths.length > 0) {
    await client.storage.from("product-media").remove(paths);
  }

  const { error } = await client.from("products").delete().eq("id", productId);
  if (error) {
    return { deleted: false as const, blocked: error.code === "23503", error: error.message };
  }
  return { deleted: true as const, blocked: false, error: null };
}
