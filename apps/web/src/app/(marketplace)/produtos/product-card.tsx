"use client";

import Link from "next/link";
import Image from "next/image";
import type { Database } from "@marketplace/supabase";
import { useCart } from "@/lib/cart-context";
import { formatPriceCents } from "@/lib/format";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  product_media: Database["public"]["Tables"]["product_media"]["Row"][];
};

export function ProductCard({
  product,
  currentUserId,
}: {
  product: Product;
  currentUserId?: string | null;
}) {
  const { addItem } = useCart();
  const cover = product.product_media[0];
  const isOwnProduct = !!currentUserId && product.seller_id === currentUserId;

  return (
    <div className="group flex cursor-pointer flex-col gap-4 rounded-3xl border border-border bg-card/30 p-5 shadow-lg backdrop-blur-md transition-all hover:border-brand/50 hover:bg-card/50">
      <Link href={`/produtos/${product.id}`}>
        <div className="relative mb-2 flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl bg-muted transition-colors group-hover:bg-secondary">
          {cover ? (
            cover.type === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={cover.url} className="h-full w-full object-cover" muted />
            ) : (
              <Image src={cover.url} alt={product.title} fill className="object-cover" />
            )
          ) : (
            <span className="text-4xl">📦</span>
          )}
          {product.product_media.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
              +{product.product_media.length - 1}
            </span>
          )}
        </div>
      </Link>
      <div>
        <Link href={`/produtos/${product.id}`}>
          <h4 className="mb-1 font-semibold text-foreground">{product.title}</h4>
        </Link>
        <p className="text-xl font-bold text-brand">{formatPriceCents(product.price_cents)}</p>
      </div>
      {isOwnProduct ? (
        <p className="rounded-xl bg-secondary/40 py-2 text-center text-xs text-muted-foreground">
          Seu produto
        </p>
      ) : (
        <button
          onClick={() => addItem(product)}
          className="rounded-xl bg-secondary py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
        >
          Adicionar ao carrinho
        </button>
      )}
    </div>
  );
}
