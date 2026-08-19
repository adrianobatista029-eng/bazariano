"use client";

import { useState } from "react";
import type { Database } from "@marketplace/supabase";

type Media = Database["public"]["Tables"]["product_media"]["Row"];

// Galeria simples e estática: sem autoplay, sem avançar sozinho — só as
// fotos/vídeos do produto em sequência, com miniaturas pra trocar a mídia em
// destaque. O efeito "stories" (autoplay, barrinha de progresso) fica só na
// bolinha da Home, não aqui.
export function ProductGallery({ media, title }: { media: Media[]; title: string }) {
  const [index, setIndex] = useState(0);
  const current = media[index];

  if (!current) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-3xl border border-border bg-card/30 backdrop-blur-md md:h-96">
        <span className="text-6xl">📦</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="h-72 w-full overflow-hidden rounded-3xl border border-border bg-black md:h-96">
        {current.type === "video" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            key={current.id}
            src={current.url}
            className="h-full w-full object-contain"
            controls
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={title} className="h-full w-full object-contain" />
        )}
      </div>

      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setIndex(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-muted ${
                i === index ? "border-brand" : "border-transparent"
              }`}
            >
              {m.type === "video" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={m.url} className="h-full w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              )}
              {m.type === "video" && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-xs text-white">
                  ▶
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
