"use client";

import Link from "next/link";
import Image from "next/image";
import type { Database } from "@marketplace/supabase";
import { useCart } from "@/lib/cart-context";
import { formatPriceCents, formatTimeAgo } from "@/lib/format";

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
  // TODO: remover o `as any` depois de rodar `supabase gen types` com a
  // migration 0013_listing_type.sql aplicada.
  const listingType = (product as any).listing_type ?? "produto";
  const isProduto = listingType === "produto";
  const isSoldOut = isProduto && product.stock <= 0;
  const city = (product as any).city as string | null | undefined;
  const state = (product as any).state as string | null | undefined;
  const locationLabel = city && state ? `${city}/${state}` : city || null;
  const originalPriceCents = (product as any).original_price_cents as number | undefined;
  const hasDiscount = !!originalPriceCents && originalPriceCents > product.price_cents;

  return (
    <div className="group flex cursor-pointer flex-col gap-2.5 rounded-2xl border border-border bg-card/30 p-3 shadow-lg backdrop-blur-md transition-all hover:border-brand/50 hover:bg-card/50">
      <Link href={`/produtos/${product.id}`}>
        <div className="relative mb-1 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-muted transition-colors group-hover:bg-secondary">
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
          {isSoldOut && (
            <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white">
              Esgotado
            </span>
          )}
        </div>
      </Link>
      <div>
        <Link href={`/produtos/${product.id}`}>
          <h4 className="mb-1 line-clamp-2 text-sm font-semibold text-foreground">{product.title}</h4>
        </Link>
        <p className="flex items-baseline gap-1.5">
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPriceCents(originalPriceCents!)}
            </span>
          )}
          <span className="text-lg font-bold text-brand">{formatPriceCents(product.price_cents)}</span>
        </p>
        {(locationLabel || product.created_at) && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {locationLabel}
            {locationLabel && product.created_at && " · "}
            {product.created_at && formatTimeAgo(product.created_at)}
          </p>
        )}
      </div>
      {isOwnProduct ? (
        <p className="rounded-xl bg-secondary/40 py-2 text-center text-xs text-muted-foreground">
          Seu produto
        </p>
      ) : !isProduto ? (
        <Link
          href={`/produtos/${product.id}`}
          className="rounded-xl bg-secondary py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
        >
          Ver anúncio
        </Link>
      ) : (
        <button
          onClick={() => addItem(product)}
          disabled={isSoldOut}
          className="rounded-xl bg-secondary py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-secondary disabled:hover:text-foreground"
        >
          {isSoldOut ? "Esgotado" : "Adicionar ao carrinho"}
        </button>
      )}
    </div>
  );
}
