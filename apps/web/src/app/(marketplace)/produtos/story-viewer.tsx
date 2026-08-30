"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteStoryWithMedia } from "@marketplace/supabase/queries";
import { formatPriceCents } from "@/lib/format";
import type { StoryGroup } from "./stories-tray";

const PHOTO_DURATION_MS = 5000;
const HOLD_THRESHOLD_MS = 180;

export function StoryViewer({
  groups,
  initialGroupIndex,
  currentUserId,
  onView,
  onClose,
}: {
  groups: StoryGroup[];
  initialGroupIndex: number;
  currentUserId: string | null;
  onView?: (storyId: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [localGroups, setLocalGroups] = useState(groups);
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const remainingMsRef = useRef(PHOTO_DURATION_MS);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const group = localGroups[groupIndex];
  const story = group?.stories[storyIndex];

  function moveGroup(next: number) {
    if (next < 0 || next >= localGroups.length) {
      onClose();
      return;
    }
    setGroupIndex(next);
    setStoryIndex(0);
  }

  function moveStory(next: number) {
    if (!group) return;
    if (next < 0) {
      moveGroup(groupIndex - 1);
      return;
    }
    if (next >= group.stories.length) {
      moveGroup(groupIndex + 1);
      return;
    }
    setStoryIndex(next);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") moveStory(storyIndex + 1);
      if (e.key === "ArrowLeft") moveStory(storyIndex - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex]);

  // Toda vez que troca de story, o tempo restante volta pro início.
  useEffect(() => {
    remainingMsRef.current = PHOTO_DURATION_MS;
    setPaused(false);
  }, [groupIndex, storyIndex]);

  // Avança sozinho depois de alguns segundos, igual Instagram — só pra foto
  // (vídeo avança pelo próprio evento onEnded). Pausa/retoma contando o tempo
  // que já passou, em vez de reiniciar do zero.
  useEffect(() => {
    if (!story || story.media_type !== "photo" || paused) return undefined;
    const start = Date.now();
    const timer = setTimeout(() => moveStory(storyIndex + 1), remainingMsRef.current);
    return () => {
      clearTimeout(timer);
      remainingMsRef.current = Math.max(0, remainingMsRef.current - (Date.now() - start));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex, story?.media_type, paused]);

  // Pausar/retomar o vídeo junto com o "segurar pra pausar".
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else video.play().catch(() => {});
  }, [paused]);

  // A duração real do vídeo só é conhecida depois que o metadata carrega —
  // até lá a barrinha desse segmento fica parada em vez de "chutar" um valor.
  useEffect(() => {
    setVideoDurationMs(null);
  }, [story?.id]);

  // Marca como vista assim que essa story é exibida — é o que faz o anel do
  // vendedor virar cinza na tray depois.
  useEffect(() => {
    if (story) onView?.(story.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  if (!group || !story) return null;

  const product = story.products;
  const listingType = product?.listing_type ?? "produto";
  const isProduto = listingType === "produto";
  const isOwnStory = !!currentUserId && group.seller.id === currentUserId;
  const currentSegmentDurationMs = story.media_type === "video" ? videoDurationMs : PHOTO_DURATION_MS;

  // Segurar (pointerdown por mais de HOLD_THRESHOLD_MS) pausa a story, igual
  // Instagram; soltar antes disso conta como toque normal (avança/volta).
  function handlePressStart() {
    holdTimerRef.current = setTimeout(() => setPaused(true), HOLD_THRESHOLD_MS);
  }
  function handlePressEnd(navigateDelta: number) {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (paused) {
      setPaused(false);
    } else {
      moveStory(storyIndex + navigateDelta);
    }
  }

  async function handleDelete() {
    if (!story || deleting) return;
    setDeleting(true);
    await deleteStoryWithMedia(createClient(), { id: story.id, media_url: story.media_url });
    setLocalGroups((prev) => {
      const next = prev.map((g, i) =>
        i === groupIndex ? { ...g, stories: g.stories.filter((_, si) => si !== storyIndex) } : g
      );
      return next;
    });
    setDeleting(false);
    router.refresh();
    // Reavalia posição: se acabaram as stories desse vendedor, pula pro
    // próximo grupo; senão fica no mesmo índice (que agora é a próxima story).
    const remaining = group.stories.length - 1;
    if (remaining <= 0) {
      moveGroup(groupIndex + 1);
    } else if (storyIndex >= remaining) {
      setStoryIndex(remaining - 1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 px-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-full max-h-[90vh] w-full max-w-sm flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes story-progress-fill {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
        <div className="absolute inset-x-4 top-3 z-20 flex gap-1">
          {group.stories.map((s, i) => (
            <div key={`${s.id}-${i}`} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white"
                style={
                  i < storyIndex
                    ? { width: "100%" }
                    : i > storyIndex
                      ? { width: "0%" }
                      : currentSegmentDurationMs
                        ? {
                            animation: `story-progress-fill ${currentSegmentDurationMs}ms linear forwards`,
                            animationPlayState: paused ? "paused" : "running",
                          }
                        : { width: "0%" }
                }
              />
            </div>
          ))}
        </div>

        <div
          className={`relative h-full flex-1 overflow-hidden rounded-3xl bg-black transition-transform ${paused ? "scale-[0.97]" : ""}`}
        >
          {story.media_type === "video" ? (
            <video
              key={story.id}
              ref={videoRef}
              src={story.media_url}
              className="h-full w-full object-contain"
              autoPlay
              muted
              playsInline
              onLoadedMetadata={(e) => setVideoDurationMs(e.currentTarget.duration * 1000)}
              onEnded={() => moveStory(storyIndex + 1)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={story.id} src={story.media_url} alt="" className="h-full w-full object-contain" />
          )}
          <div
            className="absolute left-0 top-0 h-full w-1/3 select-none"
            role="button"
            tabIndex={-1}
            aria-label="Story anterior"
            onPointerDown={handlePressStart}
            onPointerUp={() => handlePressEnd(-1)}
            onPointerLeave={() => handlePressEnd(0)}
          />
          <div
            className="absolute right-0 top-0 h-full w-1/3 select-none"
            role="button"
            tabIndex={-1}
            aria-label="Próximo story"
            onPointerDown={handlePressStart}
            onPointerUp={() => handlePressEnd(1)}
            onPointerLeave={() => handlePressEnd(0)}
          />
          {paused && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl opacity-90">
              ⏸️
            </span>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-8 z-20 flex items-center justify-between px-4">
          <span className="rounded-full bg-black/50 px-3 py-1 text-sm font-semibold text-white">
            {group.seller.full_name ?? "Vendedor"}
          </span>
          <div className="pointer-events-auto flex items-center gap-2">
            {isOwnStory && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Apagar story"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-50"
              >
                🗑️
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {product && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 rounded-b-3xl bg-gradient-to-t from-black/80 to-transparent p-4">
            <span className="text-xl font-bold text-white">{formatPriceCents(product.price_cents)}</span>
            <Link
              href={`/produtos/${product.id}`}
              className="pointer-events-auto rounded-full bg-gradient-to-r from-brand to-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              {isProduto ? "Ver produto" : "Ver anúncio"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
