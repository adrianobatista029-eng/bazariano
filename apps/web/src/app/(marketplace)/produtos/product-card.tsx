"use client";

import Link from "next/link";
import type { Database } from "@marketplace/supabase";
import { useCart } from "@/lib/cart-context";
import { formatPriceCents } from "@/lib/format";

type Product = Database["public"]["Tables"]["products"]["Row"];

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <div className="group flex cursor-pointer flex-col gap-4 rounded-3xl border border-border bg-card/30 p-5 shadow-lg backdrop-blur-md transition-all hover:border-brand/50 hover:bg-card/50">
      <Link href={`/produtos/${product.id}`}>
        <div className="mb-2 flex h-48 w-full items-center justify-center rounded-2xl bg-muted transition-colors group-hover:bg-secondary">
          {product.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.photos[0]}
              alt={product.title}
              className="h-full w-full rounded-2xl object-cover"
            />
          ) : (
            <span className="text-4xl">📦</span>
          )}
        </div>
      </Link>
      <div>
        <Link href={`/produtos/${product.id}`}>
          <h4 className="mb-1 font-semibold text-foreground">{product.title}</h4>
        </Link>
        <p className="text-xl font-bold text-brand">{formatPriceCents(product.price_cents)}</p>
      </div>
      <button
        onClick={() => addItem(product)}
        className="rounded-xl bg-secondary py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
      >
        Adicionar ao carrinho
      </button>
    </div>
  );
}
