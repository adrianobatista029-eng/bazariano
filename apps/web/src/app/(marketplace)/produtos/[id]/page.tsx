import { notFound } from "next/navigation";
import { getProductById, listProductsBySeller, listProductComments } from "@marketplace/supabase/queries";
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
import { ProductComments } from "./product-comments";
import { NearbyProductGrid } from "../nearby-product-grid";

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

  let otherProductsQuery = supabase
    .from("products")
    .select("*, product_media(*)")
    .eq("status", "active")
    .neq("id", product.id)
    .order("created_at", { ascending: false })
    .order("position", { foreignTable: "product_media", ascending: true })
    .limit(10);
  if (productExtra.category_id) {
    // TODO: remover o `as any` depois de rodar `supabase gen types` com a
    // migration 0012_categories.sql aplicada.
    otherProductsQuery = (otherProductsQuery as any).eq("category_id", productExtra.category_id);
  }

  // Nenhuma dessas consultas depende do resultado das outras — rodam em
  // paralelo em vez de uma esperar a outra terminar.
  const [
    { data: cat },
    { data: sub },
    {
      data: { user },
    },
    { data: sellerProfile },
    { data: otherProducts },
    { data: commentsData },
  ] = await Promise.all([
    productExtra.category_id
      ? (supabase.from as any)("categories").select("name").eq("id", productExtra.category_id).single()
      : Promise.resolve({ data: null }),
    productExtra.subcategory_id
      ? (supabase.from as any)("subcategories")
          .select("name")
          .eq("id", productExtra.subcategory_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase.auth.getUser(),
    supabase.from("profiles").select("id, full_name, avatar_url, created_at").eq("id", product.seller_id).single(),
    otherProductsQuery,
    listProductComments(supabase, product.id),
  ]);
  const categoryName: string | null = cat?.name ?? null;
  const subcategoryName: string | null = sub?.name ?? null;
  const isOwnProduct = user?.id === product.seller_id;
  const comments = (commentsData ?? []) as any;

  let myActiveProducts: { id: string; title: string; price_cents: number }[] = [];
  if (user && !isOwnProduct) {
    const { data } = await listProductsBySeller(supabase, user.id);
    myActiveProducts = (data ?? []).filter((p) => p.status === "active");
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <ProductGallery media={product.product_media} title={product.title} />
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">{product.title}</h1>
          {productExtra.original_price_cents > product.price_cents && (
            <p className="mt-2 text-sm text-muted-foreground line-through">
              {formatPriceCents(productExtra.original_price_cents)}
            </p>
          )}
          <p className="mt-0.5 text-2xl font-bold text-brand">
            {formatPriceCents(product.price_cents)}
            <span className="text-sm font-normal text-muted-foreground">
              {PRICE_DISPLAY_SUFFIX[listingType as keyof typeof PRICE_DISPLAY_SUFFIX]}
            </span>
          </p>
          {product.description && (
            <p className="mt-4 whitespace-pre-wrap text-muted-foreground">{product.description}</p>
          )}
          {isProduto && (
            <p
              className={
                product.stock <= 0
                  ? "mt-2 text-sm font-semibold text-destructive"
                  : "mt-2 text-sm text-muted-foreground"
              }
            >
              {product.stock <= 0 ? "Esgotado" : `${product.stock} em estoque`}
            </p>
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
                <p key={opt.key} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </p>
              ))}
            </div>
          )}
          {!isProduto && user && productExtra.contact_phone && (
            <p className="mt-2 text-sm text-muted-foreground">📞 {productExtra.contact_phone}</p>
          )}
          {productExtra.street && productExtra.city && productExtra.state && (
            <p className="mt-2 text-sm text-muted-foreground">
              📍 {productExtra.street}
              {productExtra.number ? `, ${productExtra.number}` : ""}
              {productExtra.neighborhood ? ` - ${productExtra.neighborhood}` : ""},{" "}
              {productExtra.city}/{productExtra.state}
            </p>
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
              productExtra.contact_phone &&
              (user ? (
                <a
                  href={`https://wa.me/55${(productExtra.contact_phone as string).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-gradient-to-r from-brand to-primary px-6 py-3 text-center font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
                >
                  💬 Chamar no WhatsApp
                </a>
              ) : (
                <a
                  href="/login"
                  className="rounded-xl bg-secondary px-6 py-3 text-center font-semibold text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
                >
                  Entrar para ver contato
                </a>
              ))
            )}
          </div>
        </div>
      </div>

      <ProductComments
        productId={product.id}
        comments={comments}
        currentUserId={user?.id ?? null}
        isOwnProduct={isOwnProduct}
      />

      {otherProducts && otherProducts.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-bold">Outros anúncios</h3>
          <NearbyProductGrid products={otherProducts} currentUserId={user?.id} />
        </section>
      )}
    </div>
  );
}
