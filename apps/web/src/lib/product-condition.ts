import type { ProductCondition } from "@marketplace/supabase/queries";

export const PRODUCT_CONDITIONS: { value: ProductCondition; label: string }[] = [
  { value: "novo", label: "🆕 Novo" },
  { value: "seminovo", label: "✨ Seminovo" },
  { value: "usado_bom", label: "👍 Usado - bom estado" },
  { value: "usado_reparo", label: "🔧 Usado - precisa de reparos" },
];

export const PRODUCT_CONDITION_LABEL: Record<ProductCondition, string> = {
  novo: "🆕 Novo",
  seminovo: "✨ Seminovo",
  usado_bom: "👍 Usado - bom estado",
  usado_reparo: "🔧 Usado - precisa de reparos",
};
