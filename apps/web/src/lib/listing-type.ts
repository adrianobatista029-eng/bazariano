import type { ListingType } from "@marketplace/supabase/queries";

export const LISTING_TYPES: { value: ListingType; label: string; icon: string }[] = [
  { value: "produto", label: "Produto", icon: "📦" },
  { value: "servico", label: "Serviço", icon: "🔧" },
  { value: "aluguel", label: "Aluguel de imóvel", icon: "🏠" },
  { value: "venda_imovel", label: "Venda de imóvel", icon: "🏡" },
];

export const LISTING_TYPE_LABEL: Record<ListingType, string> = {
  produto: "📦 Produto",
  servico: "🔧 Serviço",
  aluguel: "🏠 Aluguel de imóvel",
  venda_imovel: "🏡 Venda de imóvel",
};

export const PRICE_LABEL: Record<ListingType, string> = {
  produto: "Preço (ex: 49,90)",
  servico: "Valor a partir de (ex: 80,00)",
  aluguel: "Aluguel mensal (ex: 1200,00)",
  venda_imovel: "Preço de venda (ex: 350000,00)",
};

export const PRICE_DISPLAY_SUFFIX: Record<ListingType, string> = {
  produto: "",
  servico: " (a partir de)",
  aluguel: "/mês",
  venda_imovel: "",
};

// Entrada/caução não viraram campo estruturado no banco (decisão: usar a
// descrição livre pra isso) — só guiamos com um placeholder de exemplo.
export const DESCRIPTION_PLACEHOLDER: Record<ListingType, string> = {
  produto: "Descrição",
  servico: "Descrição",
  aluguel: "Descrição. Ex: Aceita pets. Caução de 1 mês de aluguel.",
  venda_imovel: "Descrição. Ex: Aceita financiamento. Entrada de R$ 50.000.",
};

// Quais categorias pertencem a cada "domínio" — fixo no código, não precisa
// de coluna nova no banco pra filtrar o select de categoria por tipo de
// anúncio.
type CategoryDomain = "produto" | "servico" | "aluguel" | "venda_imovel";

const SERVICE_CATEGORY_NAMES = new Set([
  "Casa e Manutenção",
  "Automotivo",
  "Tecnologia",
  "Limpeza",
  "Beleza e Estética",
  "Aulas e Educação",
  "Eventos",
  "Animais",
  "Jardinagem e Exterior",
  "Transporte e Entrega",
  "Serviços Profissionais",
  "Costura e Personalização",
  "Serviços Comerciais",
  "Esporte e Bem-estar",
  "Outros serviços",
]);
const RENTAL_CATEGORY_NAMES = new Set(["Imóveis para Alugar", "Imóveis"]);
const SALE_CATEGORY_NAMES = new Set(["Imóveis à Venda"]);

export function categoryDomain(categoryName: string): CategoryDomain {
  if (SERVICE_CATEGORY_NAMES.has(categoryName)) return "servico";
  if (RENTAL_CATEGORY_NAMES.has(categoryName)) return "aluguel";
  if (SALE_CATEGORY_NAMES.has(categoryName)) return "venda_imovel";
  return "produto";
}

export function listingTypeDomain(listingType: ListingType): CategoryDomain {
  if (listingType === "servico") return "servico";
  if (listingType === "aluguel") return "aluguel";
  if (listingType === "venda_imovel") return "venda_imovel";
  return "produto";
}
