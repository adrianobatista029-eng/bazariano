import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listActiveStories, listProductsBySeller } from "@marketplace/supabase/queries";
import { StoriesTray, type StoryGroup } from "./stories-tray";
import { NearbyProductGrid } from "./nearby-product-grid";
import { BannerCarousel } from "./banner-carousel";
import { PromoVideo } from "./promo-video";

type StoryRow = {
  id: string;
  seller_id: string;
  product_id: string;
  media_url: string;
  media_type: "photo" | "video";
  created_at: string;
  products: {
    id: string;
    title: string;
    price_cents: number;
    listing_type: string | null;
    status: string;
  } | null;
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: { q?: string; categoria?: string; subcategoria?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("products")
    .select("*, product_media(*)")
    .eq("status", "active")
    // Produto (não serviço/aluguel/venda de imóvel, que não usam estoque)
    // some da vitrine/busca assim que o estoque zera — continua acessível
    // por link direto na página do produto, só não aparece pra descobrir.
    .or("listing_type.neq.produto,stock.gt.0")
    .order("created_at", { ascending: false })
    .order("position", { foreignTable: "product_media", ascending: true });

  if (searchParams.q) {
    query = query.ilike("title", `%${searchParams.q}%`);
  }
  if (searchParams.categoria) {
    // TODO: remover o `as any` depois de rodar `supabase gen types` com a
    // migration 0012_categories.sql aplicada.
    query = (query as any).eq("category_id", searchParams.categoria);
  }
  if (searchParams.subcategoria) {
    query = (query as any).eq("subcategory_id", searchParams.subcategoria);
  }

  const { data: products, error } = await query;

  if (error) {
    return <p className="text-destructive">Erro ao carregar produtos: {error.message}</p>;
  }

  const { data: storiesRaw } = await listActiveStories(supabase);
  const storiesData = (storiesRaw ?? []) as unknown as StoryRow[];
  const groupsMap = new Map<string, StoryGroup>();
  for (const s of storiesData) {
    if (!s.profiles) continue;
    if (!groupsMap.has(s.seller_id)) {
      groupsMap.set(s.seller_id, { seller: s.profiles, stories: [] });
    }
    groupsMap.get(s.seller_id)!.stories.push({
      id: s.id,
      media_url: s.media_url,
      media_type: s.media_type,
      created_at: s.created_at,
      product_id: s.product_id,
      products: s.products,
    });
  }
  const storyGroups = Array.from(groupsMap.values());

  let myActiveProducts: { id: string; title: string }[] = [];
  if (user) {
    const { data: myProducts } = await listProductsBySeller(supabase, user.id);
    myActiveProducts = (myProducts ?? [])
      .filter((p) => p.status === "active")
      .map((p) => ({ id: p.id, title: p.title }));
  }

  return (
    <div className="flex flex-col gap-4">
      {searchParams.q ? (
        <section className="relative flex w-fit max-w-full items-center gap-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-card to-card/40 p-5 shadow-lg sm:p-7">
          <div className="z-10">
            <h2 className="font-display text-xl font-bold sm:text-2xl">
              Resultados para &quot;{searchParams.q}&quot;
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              {products?.length ?? 0} produto(s) encontrado(s)
            </p>
          </div>
          <div className="z-10 text-5xl opacity-80 sm:text-6xl">🔎</div>
          <div className="absolute right-0 top-0 h-full w-64 rounded-full bg-brand/10 blur-3xl" />
        </section>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="min-w-0 md:w-3/5">
            <BannerCarousel />
          </div>
          <div className="min-w-0 md:w-2/5">
            <PromoVideo />
          </div>
        </div>
      )}

      {!searchParams.q && (
        <StoriesTray
          storyGroups={storyGroups}
          currentUserId={user?.id ?? null}
          myActiveProducts={myActiveProducts}
        />
      )}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h3 className="text-lg font-bold">
            {searchParams.q ? "Resultados" : "Novos anúncios perto de você"}
          </h3>
        </div>

        {!products?.length ? (
          <p className="text-muted-foreground">Nenhum produto disponível.</p>
        ) : (
          <NearbyProductGrid products={products} currentUserId={user?.id} />
        )}
      </section>
    </div>
  );
}
