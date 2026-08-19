import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type Client = SupabaseClient<Database>;

export function listMediaForProduct(client: Client, productId: string) {
  return client
    .from("product_media")
    .select("*")
    .eq("product_id", productId)
    .order("position", { ascending: true });
}

export function createProductMedia(
  client: Client,
  items: Database["public"]["Tables"]["product_media"]["Insert"][]
) {
  return client.from("product_media").insert(items).select();
}

export function deleteProductMedia(client: Client, mediaId: string) {
  return client.from("product_media").delete().eq("id", mediaId);
}

export function updateProductMediaPosition(client: Client, mediaId: string, position: number) {
  return client.from("product_media").update({ position }).eq("id", mediaId);
}

export function deleteProductMediaFile(client: Client, path: string) {
  return client.storage.from("product-media").remove([path]);
}

// A url pública é tipo `.../storage/v1/object/public/product-media/<path>`;
// extrai só o <path> pra poder apagar o arquivo do bucket.
export function productMediaPathFromUrl(url: string) {
  const marker = "/product-media/";
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

// Caminho do arquivo no bucket "product-media": a primeira pasta precisa ser
// o id do vendedor (é o que a policy do storage confere contra auth.uid()).
export function productMediaStoragePath(
  sellerId: string,
  productId: string,
  fileName: string,
  index: number
) {
  const ext = fileName.split(".").pop() ?? "bin";
  return `${sellerId}/${productId}/${index}-${Date.now()}.${ext}`;
}

export async function uploadProductMedia(client: Client, path: string, file: File) {
  const { error } = await client.storage.from("product-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { url: null, error };

  const {
    data: { publicUrl },
  } = client.storage.from("product-media").getPublicUrl(path);
  return { url: publicUrl, error: null };
}
