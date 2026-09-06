"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Banners 100% CSS (sem imagem raster) — texto e fundo ficam nítidos em
// qualquer tamanho de tela, e cada um tem uma pequena animação no ícone.
// Cada banner leva pra uma busca específica quando o tema é um tipo de
// produto reconhecível (eletrônicos, games); os que são sobre um recurso
// do site (entrega, lojas, clips, "perto de você") ficam apontando pro
// feed geral, que já mostra/usa esse recurso.
const BANNERS = [
  {
    id: "relampago",
    title: "Oferta Relâmpago",
    subtitle: "Preços especiais por tempo limitado",
    cta: "Aproveitar agora",
    href: "/produtos?q=eletr%C3%B4nico",
    icon: "⚡",
    gradient: "linear-gradient(120deg, #1a1a1a 0%, #3a1a00 55%, #f37021 100%)",
    accent: "#f37021",
    anim: "bc-pulse",
  },
  {
    id: "entrega",
    title: "Comprou? A gente leva",
    subtitle: "Entrega rastreada em tempo real",
    cta: "Ver como funciona",
    href: "/produtos",
    icon: "📦",
    gradient: "linear-gradient(120deg, #0b2540 0%, #114a7a 55%, #1b75bc 100%)",
    accent: "#1b75bc",
    anim: "bc-drive",
  },
  {
    id: "novas-lojas",
    title: "Descubra novas lojas",
    subtitle: "Marcas e vendedores pra todo gosto",
    cta: "Explorar lojas",
    href: "/produtos",
    icon: "🏬",
    gradient: "linear-gradient(120deg, #240b3a 0%, #4a1a78 55%, #8b3fd6 100%)",
    accent: "#8b3fd6",
    anim: "bc-bounce",
  },
  {
    id: "clips",
    title: "Bazariano Clips",
    subtitle: "Veja. Gostou. Comprou.",
    cta: "Assistir clips",
    href: "/produtos",
    icon: "▶",
    gradient: "linear-gradient(120deg, #3a0b1e 0%, #7a1140 55%, #e6296f 100%)",
    accent: "#e6296f",
    anim: "bc-pulse",
  },
  {
    id: "perto-de-voce",
    title: "Tem perto de você",
    subtitle: "Produtos e lojas na sua região",
    cta: "Ver perto de mim",
    href: "/produtos",
    icon: "📍",
    gradient: "linear-gradient(120deg, #0b3a1e 0%, #146a3a 55%, #2ecc71 100%)",
    accent: "#2ecc71",
    anim: "bc-bounce",
  },
  {
    id: "semana-gamer",
    title: "Semana Gamer",
    subtitle: "Teclados, mouses, headsets e consoles",
    cta: "Ver ofertas gamer",
    href: "/produtos?q=game",
    icon: "🎮",
    gradient: "linear-gradient(120deg, #0a0a1a 0%, #1c0b3a 55%, #7b2ff7 100%)",
    accent: "#7b2ff7",
    anim: "bc-shake",
  },
  {
    id: "bazariano-sale",
    title: "Bazariano Sale",
    subtitle: "Até 70% off em milhares de produtos",
    cta: "Ver o Sale",
    href: "/produtos",
    icon: "🏷️",
    gradient: "linear-gradient(120deg, #3a1a00 0%, #7a3a00 55%, #f37021 100%)",
    accent: "#f37021",
    anim: "bc-pulse",
  },
  {
    id: "tudo-em-um-lugar",
    title: "Tudo em um só lugar",
    subtitle: "Produtos, serviços, aluguéis e imóveis",
    cta: "Explorar tudo",
    href: "/produtos",
    icon: "🛍️",
    gradient: "linear-gradient(120deg, #04262b 0%, #0a4a52 55%, #17b8c4 100%)",
    accent: "#17b8c4",
    anim: "bc-bounce",
  },
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
    <div className="relative w-full overflow-hidden rounded-2xl border border-border shadow-lg">
      <style>{`
        @keyframes bc-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.85; } }
        @keyframes bc-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes bc-shake { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
        @keyframes bc-drive { 0% { transform: translateX(0); } 50% { transform: translateX(10px); } 100% { transform: translateX(0); } }
        .bc-pulse { animation: bc-pulse 1.6s ease-in-out infinite; }
        .bc-bounce { animation: bc-bounce 1.8s ease-in-out infinite; }
        .bc-shake { animation: bc-shake 1s ease-in-out infinite; }
        .bc-drive { animation: bc-drive 2s ease-in-out infinite; }
      `}</style>

      <Link
        href={banner.href}
        className="flex aspect-[24/5] w-full items-center justify-between gap-3 px-5 sm:aspect-[5/1] sm:px-8"
        style={{ background: banner.gradient }}
      >
        <div className="flex min-w-0 flex-col gap-1 text-white sm:gap-1.5">
          <h3 className="font-display text-base font-extrabold leading-tight drop-shadow-sm sm:text-xl md:text-2xl">
            {banner.title}
          </h3>
          <p className="hidden text-xs text-white/85 sm:block sm:text-sm">
            {banner.subtitle}
          </p>
          <span
            className="mt-1 w-fit rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-md sm:px-3.5 sm:py-1.5 sm:text-xs"
            style={{ backgroundColor: banner.accent }}
          >
            {banner.cta}
          </span>
        </div>

        <div
          className={`shrink-0 text-3xl leading-none sm:text-5xl md:text-6xl ${banner.anim}`}
          aria-hidden
        >
          {banner.icon}
        </div>
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
