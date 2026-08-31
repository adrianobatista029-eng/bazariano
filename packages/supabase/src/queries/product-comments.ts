import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type Client = SupabaseClient<Database>;

// TODO: remover os `as any` depois de rodar `supabase gen types` com a
// migration 0023_buyer_stats_and_comments.sql aplicada.

export function listProductComments(client: Client, productId: string) {
  return (client.from as any)("product_comments")
    .select(
      "id, product_id, author_id, body, created_at, profiles(id, full_name, avatar_url, created_at)"
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
}

export function createProductComment(
  client: Client,
  comment: { product_id: string; author_id: string; body: string }
) {
  return (client.from as any)("product_comments").insert(comment).select().single();
}

export function deleteProductComment(client: Client, commentId: string) {
  return (client.from as any)("product_comments").delete().eq("id", commentId);
}
