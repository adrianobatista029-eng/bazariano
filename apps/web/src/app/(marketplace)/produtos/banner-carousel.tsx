"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Cada banner leva pra uma busca específica quando o tema é um tipo de
// produto reconhecível (eletrônicos, games); os que são sobre um recurso
// do site (entrega, lojas, clips, "perto de você") ficam apontando pro
// feed geral, que já mostra/usa esse recurso.
const BANNERS = [
  { id: "relampago", alt: "Oferta Relâmpago — produtos com preços especiais", href: "/produtos?q=eletr%C3%B4nico" },
  { id: "entrega", alt: "Comprou? A gente leva — entrega rastreada em tempo real", href: "/produtos" },
  { id: "novas-lojas", alt: "Descubra novas lojas", href: "/produtos" },
  { id: "clips", alt: "Veja, gostou, comprou — Bazariano Clips", href: "/produtos" },
  { id: "perto-de-voce", alt: "Tem perto de você", href: "/produtos" },
  { id: "semana-gamer", alt: "Semana Gamer — teclados, mouses, headsets e consoles", href: "/produtos?q=game" },
  { id: "bazariano-sale", alt: "Bazariano Sale — até 70% off", href: "/produtos" },
  { id: "tudo-em-um-lugar", alt: "Tudo em um só lugar", href: "/produtos" },
] as const;

const AUTOPLAY_MS = 5000;

export function BannerCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % BANNERS.length), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, []);

  function go(delta: number) {
    setIndex((i) => (i + delta + BANNERS.length) % BANNERS.length);
  }

  const banner = BANNERS[index] ?? BANNERS[0];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border shadow-lg">
      <Link href={banner.href} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/banners/${banner.id}.png`}
          alt={banner.alt}
          className="aspect-[3/1] w-full object-cover"
        />
      </Link>

      <button
        onClick={() => go(-1)}
        aria-label="Banner anterior"
        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-90 transition-opacity hover:bg-black/70 hover:opacity-100"
      >
        ‹
      </button>
      <button
        onClick={() => go(1)}
        aria-label="Próximo banner"
        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-90 transition-opacity hover:bg-black/70 hover:opacity-100"
      >
        ›
      </button>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {BANNERS.map((b, i) => (
          <button
            key={b.id}
            onClick={() => setIndex(i)}
            aria-label={`Ir pro banner ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
