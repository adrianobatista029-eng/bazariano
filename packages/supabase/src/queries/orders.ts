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
    .select("*, seller:profiles!orders_seller_id_fkey(full_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
}

// Avisa em tempo real quando um pedido novo vira disponível pra qualquer
// entregador (usado pra fazer a bolha flutuante "piscar" com o app em
// segundo plano, sem precisar ficar dando polling).
export function subscribeToAvailableOrders(client: Client, onNewOrder: () => void) {
  return client
    .channel("available-orders")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "orders", filter: "status=eq.pending" },
      () => onNewOrder()
    )
    .subscribe();
}

export function getCourierEarningsToday(client: Client, courierId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return client
    .from("orders")
    .select("total_cents")
    .eq("courier_id", courierId)
    .eq("status", "delivered")
    .gte("updated_at", startOfDay.toISOString())
    .then(({ data, error }) => ({
      total_cents: (data ?? []).reduce((sum, row) => sum + row.total_cents, 0),
      error,
    }));
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
