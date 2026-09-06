import { notFound } from "next/navigation";
import { getStoreBySlug, listProductsBySeller } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "../../produtos/product-card";

export default async function LojaPublicaPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: store } = await getStoreBySlug(supabase, params.slug);
  if (!store) notFound();

  const { data: products } = await listProductsBySeller(supabase, store.id);
  const activeProducts = (products ?? []).filter((p) => p.status === "active");

  return (
    <div>
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
          {store.description && <p className="text-sm text-muted-foreground">{store.description}</p>}
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
