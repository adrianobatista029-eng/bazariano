"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Database } from "@marketplace/supabase";
import { formatPriceCents } from "@/lib/format";
import { MediaCarousel } from "./[id]/media-carousel";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  product_media: Database["public"]["Tables"]["product_media"]["Row"][];
};

export function StoryViewer({
  products,
  initialIndex,
  onClose,
}: {
  products: Product[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const product = products[index];

  // Sai dos limites do array (passou do último produto, ou voltou antes do
  // primeiro) — fecha o viewer, igual ao Instagram fazendo isso no fim.
  function moveTo(next: number) {
    if (next < 0 || next >= products.length) {
      onClose();
      return;
    }
    setIndex(next);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") moveTo(index + 1);
      if (e.key === "ArrowLeft") moveTo(index - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 px-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-full max-h-[90vh] w-full max-w-sm flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <MediaCarousel
          media={product.product_media}
          title={product.title}
          className="h-full flex-1 rounded-3xl"
          onRequestNext={() => moveTo(index + 1)}
          onRequestPrev={() => moveTo(index - 1)}
        />

        <div className="pointer-events-none absolute inset-x-0 top-6 z-20 flex items-center justify-between px-4">
          <span className="rounded-full bg-black/50 px-3 py-1 text-sm font-semibold text-white">
            {product.title}
          </span>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
          >
            ✕
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 rounded-b-3xl bg-gradient-to-t from-black/80 to-transparent p-4">
          <span className="text-xl font-bold text-white">
            {formatPriceCents(product.price_cents)}
          </span>
          <Link
            href={`/produtos/${product.id}`}
            className="pointer-events-auto rounded-full bg-gradient-to-r from-brand to-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Ver produto
          </Link>
        </div>
      </div>
    </div>
  );
}
