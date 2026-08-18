import { notFound } from "next/navigation";
import { getProductById } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { formatPriceCents } from "@/lib/format";
import { AddToCartButton } from "./add-to-cart-button";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: product, error } = await getProductById(supabase, params.id);

  if (error || !product) {
    notFound();
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <div className="flex h-96 w-full items-center justify-center rounded-3xl border border-border bg-card/30 backdrop-blur-md">
        {product.photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.photos[0]}
            alt={product.title}
            className="h-full w-full rounded-3xl object-cover"
          />
        ) : (
          <span className="text-6xl">📦</span>
        )}
      </div>
      <div>
        <h1 className="font-display text-2xl font-semibold">{product.title}</h1>
        <p className="mt-2 text-2xl font-bold text-brand">
          {formatPriceCents(product.price_cents)}
        </p>
        <p className="mt-4 text-muted-foreground">{product.description}</p>
        <p className="mt-2 text-sm text-muted-foreground">{product.stock} em estoque</p>
        <AddToCartButton product={product} />
      </div>
    </div>
  );
}
