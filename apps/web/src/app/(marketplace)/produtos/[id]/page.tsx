import { notFound } from "next/navigation";
import { getProductById } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { formatPriceCents } from "@/lib/format";
import { BuyButton } from "./buy-button";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: product, error } = await getProductById(supabase, params.id);

  if (error || !product) {
    notFound();
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="aspect-square w-full rounded-xl bg-muted">
        {product.photos[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.photos[0]}
            alt={product.title}
            className="h-full w-full rounded-xl object-cover"
          />
        )}
      </div>
      <div>
        <h1 className="text-2xl font-semibold">{product.title}</h1>
        <p className="mt-1 text-lg text-brand">{formatPriceCents(product.price_cents)}</p>
        <p className="mt-4 text-muted-foreground">{product.description}</p>
        <p className="mt-2 text-sm text-muted-foreground">{product.stock} em estoque</p>
        <BuyButton product={product} />
      </div>
    </div>
  );
}
