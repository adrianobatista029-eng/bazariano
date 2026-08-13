import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type Client = SupabaseClient<Database>;

export function listOrdersAsBuyer(client: Client, buyerId: string) {
  return client
    .from("orders")
    .select("*, order_items(*, products(*))")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
}

export function listOrdersAsSeller(client: Client, sellerId: string) {
  return client
    .from("orders")
    .select("*, order_items(*, products(*))")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
}

export function listAvailableOrdersForCourier(client: Client) {
  return client
    .from("orders")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
}

export function listOrdersAssignedToCourier(client: Client, courierId: string) {
  return client
    .from("orders")
    .select("*")
    .eq("courier_id", courierId)
    .in("status", ["accepted", "picked_up", "delivering"])
    .order("created_at", { ascending: false });
}

export function getOrderById(client: Client, orderId: string) {
  return client
    .from("orders")
    .select("*, order_items(*, products(*))")
    .eq("id", orderId)
    .single();
}

export function createOrder(
  client: Client,
  order: Database["public"]["Tables"]["orders"]["Insert"],
  items: Omit<Database["public"]["Tables"]["order_items"]["Insert"], "order_id">[]
) {
  return client
    .from("orders")
    .insert(order)
    .select()
    .single()
    .then(async ({ data: createdOrder, error }) => {
      if (error || !createdOrder) return { data: null, error };
      const { error: itemsError } = await client
        .from("order_items")
        .insert(items.map((item) => ({ ...item, order_id: createdOrder.id })));
      if (itemsError) return { data: null, error: itemsError };
      return { data: createdOrder, error: null };
    });
}

export function acceptOrderAsCourier(client: Client, orderId: string, courierId: string) {
  return client
    .from("orders")
    .update({ courier_id: courierId, status: "accepted" })
    .eq("id", orderId)
    .eq("status", "pending")
    .select()
    .single();
}

export function updateOrderStatus(
  client: Client,
  orderId: string,
  status: Database["public"]["Tables"]["orders"]["Row"]["status"]
) {
  return client.from("orders").update({ status }).eq("id", orderId).select().single();
}
