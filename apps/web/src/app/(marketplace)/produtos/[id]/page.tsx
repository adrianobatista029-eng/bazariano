import { notFound } from "next/navigation";
import { getProductById, listProductsBySeller } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { formatPriceCents } from "@/lib/format";
import { PRODUCT_CONDITION_LABEL } from "@/lib/product-condition";
import { PACKAGE_SIZE_LABEL } from "@/lib/package-size";
import { PRICE_DISPLAY_SUFFIX } from "@/lib/listing-type";
import { DELIVERY_OPTIONS } from "@/lib/delivery-options";
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

  // TODO: remover os `as any` depois de rodar `supabase gen types` com as
  // migrations 0009_condition_delivery_location.sql e 0012_categories.sql
  // aplicadas.
  const productExtra = product as any;
  const listingType = productExtra.listing_type ?? "produto";
  const isProduto = listingType === "produto";

  let categoryName: string | null = null;
  let subcategoryName: string | null = null;
  if (productExtra.category_id) {
    const { data: cat } = await (supabase.from as any)("categories")
      .select("name")
      .eq("id", productExtra.category_id)
      .single();
    categoryName = cat?.name ?? null;
  }
  if (productExtra.subcategory_id) {
    const { data: sub } = await (supabase.from as any)("subcategories")
      .select("name")
      .eq("id", productExtra.subcategory_id)
      .single();
    subcategoryName = sub?.name ?? null;
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
          <span className="text-sm font-normal text-muted-foreground">
            {PRICE_DISPLAY_SUFFIX[listingType as keyof typeof PRICE_DISPLAY_SUFFIX]}
          </span>
        </p>
        {product.description && (
          <p className="mt-4 whitespace-pre-wrap text-muted-foreground">{product.description}</p>
        )}
        {isProduto && (
          <p className="mt-2 text-sm text-muted-foreground">{product.stock} em estoque</p>
        )}
        {categoryName && (
          <p className="mt-2 text-sm text-muted-foreground">
            {categoryName}
            {subcategoryName && ` › ${subcategoryName}`}
          </p>
        )}
        {isProduto && productExtra.condition && (
          <p className="mt-2 text-sm text-muted-foreground">
            {PRODUCT_CONDITION_LABEL[productExtra.condition as keyof typeof PRODUCT_CONDITION_LABEL] ?? productExtra.condition}
            {productExtra.package_size &&
              ` · ${PACKAGE_SIZE_LABEL[productExtra.package_size as keyof typeof PACKAGE_SIZE_LABEL]}`}
          </p>
        )}
        {isProduto && (
          <div className="mt-2 flex flex-col gap-0.5">
            {DELIVERY_OPTIONS.filter((opt) =>
              opt.key === "allow_seller_delivery"
                ? productExtra.allow_seller_delivery === true
                : productExtra[opt.key] !== false
            ).map((opt) => (
              <p key={opt.key} className="text-sm text-muted-foreground">
                {opt.icon} {opt.label}
              </p>
            ))}
          </div>
        )}
        {!isProduto && productExtra.contact_phone && (
          <p className="mt-2 text-sm text-muted-foreground">📞 {productExtra.contact_phone}</p>
        )}
        {sellerProfile && <SellerBadge seller={sellerProfile} />}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          {isProduto ? (
            <>
              <AddToCartButton product={product} isOwnProduct={isOwnProduct} />
              {user && !isOwnProduct && (
                <TradeOfferButton
                  listingProduct={{ id: product.id, title: product.title, price_cents: product.price_cents }}
                  sellerId={product.seller_id}
                  buyerId={user.id}
                  myActiveProducts={myActiveProducts}
                />
              )}
            </>
          ) : (
            !isOwnProduct &&
            productExtra.contact_phone && (
              <a
                href={`https://wa.me/55${(productExtra.contact_phone as string).replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-gradient-to-r from-brand to-primary px-6 py-3 text-center font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
              >
                💬 Chamar no WhatsApp
              </a>
            )
          )}
        </div>
      </div>
    </div>
  );
}
