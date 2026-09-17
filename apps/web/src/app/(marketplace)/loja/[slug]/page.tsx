import { notFound } from "next/navigation";
import { getStoreBySlug, listProductsBySeller } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "../../produtos/product-card";
import { StoreOwnerPanel } from "./store-owner-panel";

export default async function LojaPublicaPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: storeData } = await getStoreBySlug(supabase, params.slug);
  if (!storeData) notFound();
  // TODO: tirar esse cast quando database.types.ts for regenerado com a
  // migration 0036_store_address.sql aplicada.
  const store = storeData as typeof storeData & {
    city: string | null;
    state: string | null;
  };

  const isOwner = user?.id === store.owner_id;

  const { data: sellerProducts } = await listProductsBySeller(supabase, store.owner_id);
  const storeProducts = (sellerProducts ?? [])
    .filter((p) => p.store_id === store.id)
    .sort((a, b) => a.position - b.position);
  const activeProducts = storeProducts.filter((p) => p.status === "active");

  return (
    <div>
      {isOwner && <StoreOwnerPanel store={store} products={storeProducts} />}

      {store.banner_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={store.banner_url}
          alt=""
          className="mb-4 h-40 w-full rounded-2xl object-cover md:h-56"
        />
      )}

      <div className="mb-6 flex items-center gap-4">
        {store.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logo_url} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ backgroundColor: store.primary_color ?? "#f97316" }}
          >
            {store.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold text-foreground">{store.name}</h1>
          {/* Só cidade/UF na bio pública — endereço completo é privado. */}
          {store.city && (
            <p className="text-sm text-muted-foreground">
              📍 {store.city}
              {store.state ? `/${store.state}` : ""}
            </p>
          )}
        </div>
      </div>

      {activeProducts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
          Essa loja ainda não tem produtos anunciados.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {activeProducts.map((product) => (
            <ProductCard key={product.id} product={product} currentUserId={user?.id} />
          ))}
        </div>
      )}
    </div>
  );
}
