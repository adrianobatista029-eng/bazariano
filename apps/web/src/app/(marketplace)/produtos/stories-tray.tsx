"use client";

import { useState } from "react";
import Image from "next/image";
import type { Database } from "@marketplace/supabase";
import { StoryViewer } from "./story-viewer";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  product_media: Database["public"]["Tables"]["product_media"]["Row"][];
};

export function StoriesTray({ products }: { products: Product[] }) {
  const withMedia = products.filter((p) => p.product_media.length > 0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (withMedia.length === 0) return null;

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {withMedia.map((product, i) => {
          const cover = product.product_media[0]!;
          return (
            <button
              key={product.id}
              onClick={() => setOpenIndex(i)}
              className="flex shrink-0 flex-col items-center gap-1.5"
            >
              <div className="rounded-full bg-gradient-to-tr from-brand to-primary p-[2px]">
                <div className="rounded-full bg-background p-[2px]">
                  <div className="relative h-16 w-16 overflow-hidden rounded-full bg-muted">
                    {cover.type === "video" ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video src={cover.url} className="h-full w-full object-cover" muted />
                    ) : (
                      <Image
                        src={cover.url}
                        alt={product.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </div>
                </div>
              </div>
              <span className="w-16 truncate text-center text-xs text-muted-foreground">
                {product.title}
              </span>
            </button>
          );
        })}
      </div>

      {openIndex !== null && (
        <StoryViewer
          products={withMedia}
          initialIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
