"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CreateStoryModal, JUST_PUBLISHED_STORY_KEY } from "./create-story-modal";
import { StoryViewer } from "./story-viewer";
import { StoryRing } from "./story-ring";

export type StoryWithProduct = {
  id: string;
  media_url: string;
  media_type: "photo" | "video";
  created_at: string;
  product_id: string;
  products: {
    id: string;
    title: string;
    price_cents: number;
    listing_type: string | null;
    status: string;
  } | null;
};

export type StoryGroup = {
  seller: { id: string; full_name: string | null; avatar_url: string | null };
  stories: StoryWithProduct[];
};

const SEEN_STORY_IDS_KEY = "bazariano-seen-story-ids";

function loadSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_STORY_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_STORY_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage indisponível (modo privado, etc.) — segue sem persistir.
  }
}

export function StoriesTray({
  storyGroups,
  currentUserId,
  myActiveProducts,
}: {
  storyGroups: StoryGroup[];
  currentUserId: string | null;
  myActiveProducts: { id: string; title: string }[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string> | null>(null);
  const [justPublishedId, setJustPublishedId] = useState<string | null>(null);

  // Carrega o que já foi visto (por dispositivo) e, se acabou de publicar
  // (veio do CreateStoryModal), guarda o id pra tocar a animação uma vez.
  useEffect(() => {
    setSeenIds(loadSeenIds());
    const justPublished = sessionStorage.getItem(JUST_PUBLISHED_STORY_KEY);
    if (justPublished) {
      setJustPublishedId(justPublished);
      sessionStorage.removeItem(JUST_PUBLISHED_STORY_KEY);
      setTimeout(() => setJustPublishedId(null), 900);
    }
  }, []);

  function markSeen(storyId: string) {
    setSeenIds((prev) => {
      const next = new Set(prev ?? []);
      next.add(storyId);
      saveSeenIds(next);
      return next;
    });
  }

  // Stories novas aparecem primeiro; visualizadas continuam disponíveis, só
  // vão pro final com o anel cinza.
  const orderedGroups = useMemo(() => {
    if (!seenIds) return storyGroups;
    const isGroupNew = (g: StoryGroup) => g.stories.some((s) => !seenIds.has(s.id));
    return [...storyGroups].sort((a, b) => Number(isGroupNew(b)) - Number(isGroupNew(a)));
  }, [storyGroups, seenIds]);

  if (!currentUserId && storyGroups.length === 0) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {currentUserId && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/instagram-stories.png" alt="" className="h-16 w-16" />
            </div>
            <span className="w-16 truncate text-center text-xs text-muted-foreground">Seu story</span>
          </button>
        )}

        {orderedGroups.map((group) => {
          const isNew = !seenIds || group.stories.some((s) => !seenIds.has(s.id));
          const isPublishing = group.stories.some((s) => s.id === justPublishedId);
          return (
            <button
              key={group.seller.id}
              onClick={() => setViewerGroupIndex(storyGroups.indexOf(group))}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <StoryRing state={isNew ? "new" : "viewed"} publishing={isPublishing}>
                {group.seller.avatar_url ? (
                  <Image
                    src={group.seller.avatar_url}
                    alt={group.seller.full_name ?? ""}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">
                    {(group.seller.full_name ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </StoryRing>
              <span className="w-16 truncate text-center text-xs text-muted-foreground">
                {group.seller.full_name ?? "Vendedor"}
              </span>
            </button>
          );
        })}
      </div>

      {createOpen && (
        <CreateStoryModal myActiveProducts={myActiveProducts} onClose={() => setCreateOpen(false)} />
      )}

      {viewerGroupIndex !== null && (
        <StoryViewer
          groups={storyGroups}
          initialGroupIndex={viewerGroupIndex}
          currentUserId={currentUserId}
          onView={markSeen}
          onClose={() => setViewerGroupIndex(null)}
        />
      )}
    </>
  );
}
