import type { OrderStatus } from "@marketplace/supabase";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Aguardando entregador",
  accepted: "Entregador a caminho da coleta",
  picked_up: "Coletado",
  delivering: "Em entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};
