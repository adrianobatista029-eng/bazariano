"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import type { OrderStatus } from "@marketplace/supabase";
import { TrackingMap } from "./tracking-map";

type Order = {
  id: string;
  status: OrderStatus;
  courier_id: string | null;
  courier_lat: number | null;
  courier_lng: number | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
};

const TRACKABLE_STATUSES: OrderStatus[] = ["picked_up", "delivering"];

// Antes, status/courier_id só vinham do fetch inicial (Server Component) —
// o comprador/vendedor precisava dar F5 pra ver o pedido avançar de
// "aceito" pra "coletado" etc. Assinando `orders` aqui, a página inteira
// reage sozinha (igual o mapa já fazia com a localização).
export function OrderStatusView({ initialOrder }: { initialOrder: Order }) {
  const [order, setOrder] = useState(initialOrder);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`order-status-${initialOrder.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${initialOrder.id}` },
        (payload) => {
          setOrder((prev) => ({ ...prev, ...(payload.new as Order) }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialOrder.id]);

  return (
    <>
      <p className="mb-4 text-muted-foreground">{ORDER_STATUS_LABEL[order.status]}</p>

      {order.courier_id && TRACKABLE_STATUSES.includes(order.status) ? (
        <TrackingMap
          orderId={order.id}
          initialCourierLocation={
            order.courier_lat && order.courier_lng
              ? { lat: order.courier_lat, lng: order.courier_lng }
              : null
          }
          destination={
            order.delivery_lat && order.delivery_lng
              ? { lat: order.delivery_lat, lng: order.delivery_lng }
              : null
          }
        />
      ) : (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
          O mapa fica disponível assim que o entregador coletar o pedido.
        </p>
      )}
    </>
  );
}
