import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type Client = SupabaseClient<Database>;

// TODO: trocar os `as any` por tipos gerados depois de rodar
// `supabase gen types` com a migration 0006_trade_offers.sql aplicada — a
// tabela `trade_offers` ainda não existe no database.types.ts.

export type TradeOfferRow = {
  id: string;
  listing_product_id: string;
  offered_product_id: string;
  buyer_id: string;
  seller_id: string;
  cash_adjustment_cents: number;
  message: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  awaiting_response_from: "buyer" | "seller";
  created_at: string;
  updated_at: string;
  listing_product: { id: string; title: string; price_cents: number; product_media: { url: string; type: string }[] } | null;
  offered_product: { id: string; title: string; price_cents: number; product_media: { url: string; type: string }[] } | null;
};

const SELECT_WITH_PRODUCTS =
  "*, listing_product:products!trade_offers_listing_product_id_fkey(id, title, price_cents, product_media(url, type)), offered_product:products!trade_offers_offered_product_id_fkey(id, title, price_cents, product_media(url, type))";

export function listTradeOffersForUser(client: Client, userId: string) {
  return (client.from as any)("trade_offers")
    .select(SELECT_WITH_PRODUCTS)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("updated_at", { ascending: false });
}

export function createTradeOffer(
  client: Client,
  offer: {
    listing_product_id: string;
    offered_product_id: string;
    buyer_id: string;
    seller_id: string;
    cash_adjustment_cents: number;
    message: string | null;
  }
) {
  return (client.from as any)("trade_offers").insert(offer).select().single();
}

export function respondToTradeOffer(
  client: Client,
  offerId: string,
  patch: {
    status?: "accepted" | "rejected" | "cancelled";
    cash_adjustment_cents?: number;
    message?: string | null;
    awaiting_response_from?: "buyer" | "seller";
  }
) {
  return (client.from as any)("trade_offers").update(patch).eq("id", offerId).select().single();
}
