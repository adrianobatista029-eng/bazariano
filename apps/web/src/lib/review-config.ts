export type ReviewTargetType = "seller" | "courier" | "buyer" | "product";

export const REVIEW_TARGET_LABEL: Record<ReviewTargetType, string> = {
  seller: "Vendedor",
  courier: "Entregador",
  buyer: "Comprador",
  product: "Produto",
};

export const REVIEW_DIMENSIONS: Record<ReviewTargetType, { key: string; label: string }[]> = {
  seller: [
    { key: "comunicacao", label: "Comunicação" },
    { key: "produto", label: "Produto" },
    { key: "confiabilidade", label: "Confiabilidade" },
  ],
  courier: [
    { key: "pontualidade", label: "Pontualidade" },
    { key: "cuidado", label: "Cuidado com o pedido" },
    { key: "educacao", label: "Educação" },
  ],
  product: [
    { key: "conforme_anuncio", label: "Conforme anúncio" },
    { key: "qualidade", label: "Qualidade" },
    { key: "estado", label: "Estado" },
  ],
  buyer: [
    { key: "comunicacao", label: "Comunicação" },
    { key: "confiabilidade", label: "Confiabilidade" },
    { key: "educacao", label: "Educação" },
  ],
};

export const REVIEW_TAGS: Record<ReviewTargetType, { code: string; label: string }[]> = {
  seller: [
    { code: "bom_vendedor", label: "🤝 Bom vendedor" },
    { code: "boa_comunicacao", label: "💬 Boa comunicação" },
    { code: "recomendo", label: "👍 Recomendo" },
  ],
  courier: [
    { code: "entrega_rapida", label: "⚡ Entrega rápida" },
    { code: "pontual", label: "🕒 Pontual" },
    { code: "recomendo", label: "👍 Recomendo" },
  ],
  product: [
    { code: "conforme_anuncio", label: "✅ Conforme anúncio" },
    { code: "bem_embalado", label: "📦 Bem embalado" },
    { code: "recomendo", label: "👍 Recomendo" },
  ],
  buyer: [
    { code: "bom_comprador", label: "🤝 Bom comprador" },
    { code: "pagamento_rapido", label: "⚡ Pagamento rápido" },
    { code: "recomendo", label: "👍 Recomendo" },
  ],
};

export function averageRating(dimensions: Record<string, number>) {
  const values = Object.values(dimensions);
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;
}
