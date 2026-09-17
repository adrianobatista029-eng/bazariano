"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// Vídeo de propaganda ao lado do carrossel de banners, mesma proporção e
// cantos arredondados — toca em loop, sem controles nativos, pra combinar
// com o resto do topo da home. Não é clicável (o clique não navega pra
// lugar nenhum) — só o botão "Anunciar" (mesmo esquema do antigo "Anunciar
// agora": gradiente brand→primary com glow) e o botão de som, no mesmo
// esquema dos vídeos de anúncio (mudo por padrão, ícone alterna).
export function PromoVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  // O <video autoplay> só é criado depois que o JS já rodou no navegador —
  // nunca vai no HTML que o servidor manda. Isso fecha de vez a brecha do
  // áudio vazando: sem isso, o navegador lê "autoplay" sem "muted" ainda
  // no HTML bruto (antes do React hidratar) e pode tentar tocar com som
  // por uma fração de segundo. Client-only elimina essa janela na origem.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Reforça o mudo no próprio ref (redundante com o atributo `muted` abaixo,
  // mas garante a propriedade mesmo se o atributo falhar por algum motivo).
  // Precisa ser useCallback com deps vazias — uma função nova a cada render
  // faz o React desconectar/reconectar o ref (e remutar o vídeo) a cada
  // re-render, cancelando o botão de som.
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el) el.muted = true;
  }, []);

  // Pausa o vídeo (e o áudio junto) assim que ele sai da tela, e ao
  // desmontar o componente — sem isso o áudio continua tocando "vazando"
  // mesmo com o vídeo fora de vista.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!videoRef.current || !entry) return;
        if (entry.isIntersecting) {
          videoRef.current.play().catch(() => {});
        } else {
          videoRef.current.pause();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      el.pause();
    };
  }, []);

  function toggleMuted() {
    setMuted((current) => {
      const next = !current;
      if (videoRef.current) videoRef.current.muted = next;
      if (!next && volume === 0) changeVolume(1);
      return next;
    });
  }

  function changeVolume(next: number) {
    setVolume(next);
    if (videoRef.current) {
      videoRef.current.volume = next;
      videoRef.current.muted = next === 0;
    }
    setMuted(next === 0);
  }

  if (!mounted) {
    return (
      <div className="aspect-[12/5] w-full animate-pulse rounded-2xl border border-border bg-secondary shadow-lg sm:aspect-[5/2]" />
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border shadow-lg">
      <video
        ref={setVideoRef}
        className="aspect-[12/5] w-full object-cover sm:aspect-[5/2]"
        src="/video/propaganda-bazariano.mp4"
        preload="auto"
        autoPlay
        loop
        muted
        playsInline
      />

      <Link
        href="/vender"
        className="absolute bottom-3 left-3 w-fit rounded-full bg-gradient-to-r from-brand to-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] sm:bottom-4 sm:left-4 sm:px-3.5 sm:py-1.5 sm:text-xs lg:px-5 lg:py-2 lg:text-sm"
      >
        Anunciar
      </Link>

      <div className="group absolute bottom-3 right-3 flex items-center gap-2 sm:bottom-4 sm:right-4">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => changeVolume(Number(e.target.value))}
          aria-label="Volume"
          className="h-1 w-0 shrink-0 cursor-pointer overflow-hidden rounded-full bg-white/40 opacity-0 accent-white transition-all duration-200 group-hover:w-16 group-hover:opacity-100 group-focus-within:w-16 group-focus-within:opacity-100 sm:group-hover:w-20 sm:group-focus-within:w-20"
        />
        <button
          type="button"
          onClick={toggleMuted}
          aria-label={muted ? "Ativar som" : "Silenciar"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 sm:h-8 sm:w-8"
        >
          {muted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
