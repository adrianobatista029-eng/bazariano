import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type Client = SupabaseClient<Database>;

export type ReviewInsert = {
  order_id: string;
  reviewer_id: string;
  reviewee_id: string | null;
  target_type: "seller" | "courier" | "buyer" | "product";
  product_id: string | null;
  dimension_ratings: Record<string, number>;
  overall_rating: number;
  tags: string[];
  comment: string | null;
};

// TODO: trocar os `as any` por tipos gerados depois de rodar
// `supabase gen types` com a migration 0005_reviews.sql aplicada — a tabela
// `reviews` e as funções de stats ainda não existem no database.types.ts.

export function createReview(client: Client, review: ReviewInsert) {
  return (client.from as any)("reviews").insert(review).select().single();
}

export function listReviewsByReviewer(client: Client, orderIds: string[], reviewerId: string) {
  return (client.from as any)("reviews")
    .select("order_id, target_type, product_id")
    .in("order_id", orderIds)
    .eq("reviewer_id", reviewerId);
}

export async function getSellerPublicStats(client: Client, sellerId: string) {
  const { data, error } = await (client.rpc as any)("get_seller_public_stats", {
    p_seller_id: sellerId,
  }).single();
  return { data: data as SellerStats | null, error };
}

export async function getCourierPublicStats(client: Client, courierId: string) {
  const { data, error } = await (client.rpc as any)("get_courier_public_stats", {
    p_courier_id: courierId,
  }).single();
  return { data: data as CourierStats | null, error };
}

export async function getProductPublicStats(client: Client, productId: string) {
  const { data, error } = await (client.rpc as any)("get_product_public_stats", {
    p_product_id: productId,
  }).single();
  return { data: data as ProductStats | null, error };
}

export type SellerStats = {
  completed_orders: number;
  avg_rating: number;
  total_reviews: number;
  top_tags: string[];
};

export type CourierStats = {
  completed_deliveries: number;
  avg_rating: number;
  total_reviews: number;
  top_tags: string[];
};

export type ProductStats = {
  avg_rating: number;
  total_reviews: number;
  top_tags: string[];
};
