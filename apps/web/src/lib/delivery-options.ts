export const DELIVERY_OPTIONS = [
  {
    key: "allow_pickup" as const,
    label: "Retirada no endereço",
    hint: "O comprador busca o produto com você",
    icon: "🏠",
  },
  {
    key: "allow_seller_delivery" as const,
    label: "Você leva até o comprador",
    hint: "Entrega feita por você mesmo, sem entregador",
    icon: "🚗",
  },
  {
    key: "allow_delivery" as const,
    label: "Envio pelo app",
    hint: "Um entregador parceiro busca e entrega",
    icon: "🛵",
    recommended: true,
  },
];

export type DeliveryFlags = {
  allow_pickup: boolean;
  allow_seller_delivery: boolean;
  allow_delivery: boolean;
};
