"use client";

import { useEffect, useRef, useState } from "react";
import type { Database } from "@marketplace/supabase";

type Media = Database["public"]["Tables"]["product_media"]["Row"];

const PHOTO_DURATION_MS = 5000;

export function MediaCarousel({
  media,
  title,
  className = "h-96 rounded-3xl border border-border",
  onRequestNext,
  onRequestPrev,
}: {
  media: Media[];
  title: string;
  /** Classes de tamanho/borda do container — permite reusar em tela cheia (stories) ou embutido na página do produto. */
  className?: string;
  /** Chamado ao tentar avançar depois do último item. Se omitido, volta pro início (loop). */
  onRequestNext?: () => void;
  /** Chamado ao tentar voltar antes do primeiro item. Se omitido, não faz nada. */
  onRequestPrev?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<number | undefined>(undefined);

  const current = media[index];

  function goTo(next: number) {
    setProgress(0);
    setIndex(next);
  }

  function advance() {
    if (index + 1 >= media.length) {
      if (onRequestNext) onRequestNext();
      else goTo(0);
    } else {
      goTo(index + 1);
    }
  }

  function retreat() {
    if (index === 0) {
      onRequestPrev?.();
    } else {
      goTo(index - 1);
    }
  }

  useEffect(() => {
    setIndex(0);
    setProgress(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media]);

  useEffect(() => {
    setProgress(0);
    if (!current) return;

    if (current.type === "photo") {
      const start = Date.now();
      function tick() {
        const elapsed = Date.now() - start;
        const pct = Math.min(1, elapsed / PHOTO_DURATION_MS);
        setProgress(pct);
        if (pct >= 1) {
          advance();
        } else {
          frameRef.current = requestAnimationFrame(tick);
        }
      }
      frameRef.current = requestAnimationFrame(tick);
      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.id]);

  function handleVideoTimeUpdate() {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress(video.currentTime / video.duration);
  }

  if (!current) {
    return (
      <div className={`flex w-full items-center justify-center bg-card/30 backdrop-blur-md ${className}`}>
        <span className="text-6xl">📦</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full select-none overflow-hidden bg-black ${className}`}>
      {media.length > 1 && (
        <div className="absolute left-2 right-2 top-2 z-10 flex gap-1">
          {media.map((m, i) => (
            <div key={m.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white"
                style={{
                  width: `${i < index ? 100 : i === index ? progress * 100 : 0}%`,
                  transition: i === index && current?.type === "video" ? "none" : undefined,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {current.type === "video" ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          src={current.url}
          className="h-full w-full object-contain"
          autoPlay
          playsInline
          muted
          onTimeUpdate={handleVideoTimeUpdate}
          onEnded={advance}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current.url} alt={title} className="h-full w-full object-contain" />
      )}

      <button aria-label="Anterior" onClick={retreat} className="absolute left-0 top-0 h-full w-1/3 cursor-pointer" />
      <button aria-label="Próximo" onClick={advance} className="absolute right-0 top-0 h-full w-1/3 cursor-pointer" />
    </div>
  );
}
