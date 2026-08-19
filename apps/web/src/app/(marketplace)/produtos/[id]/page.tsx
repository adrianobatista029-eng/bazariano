import { notFound } from "next/navigation";
import { getProductById, listProductsBySeller } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { formatPriceCents } from "@/lib/format";
import { AddToCartButton } from "./add-to-cart-button";
import { ProductGallery } from "./product-gallery";
import { SellerBadge } from "./seller-badge";
import { TradeOfferButton } from "./trade-offer-button";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: product, error } = await getProductById(supabase, params.id);

  if (error || !product) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwnProduct = user?.id === product.seller_id;

  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, created_at")
    .eq("id", product.seller_id)
    .single();

  let myActiveProducts: { id: string; title: string; price_cents: number }[] = [];
  if (user && !isOwnProduct) {
    const { data } = await listProductsBySeller(supabase, user.id);
    myActiveProducts = (data ?? []).filter((p) => p.status === "active");
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <ProductGallery media={product.product_media} title={product.title} />
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">{product.title}</h1>
        <p className="mt-2 text-2xl font-bold text-brand">
          {formatPriceCents(product.price_cents)}
        </p>
        {product.description && (
          <p className="mt-4 whitespace-pre-wrap text-muted-foreground">{product.description}</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">{product.stock} em estoque</p>
        {sellerProfile && <SellerBadge seller={sellerProfile} />}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <AddToCartButton product={product} isOwnProduct={isOwnProduct} />
          {user && !isOwnProduct && (
            <TradeOfferButton
              listingProduct={{ id: product.id, title: product.title, price_cents: product.price_cents }}
              sellerId={product.seller_id}
              buyerId={user.id}
              myActiveProducts={myActiveProducts}
            />
          )}
        </div>
      </div>
    </div>
  );
}
