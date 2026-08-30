"use client";

import type { StoryContentType } from "@marketplace/supabase/queries";
import { STORY_TYPE_PULSE, STORY_TYPE_SHIMMER, StoryTypeIcon } from "./story-type-icons";

// Anel de destaque do Stories (identidade própria: dourado → magenta → roxo),
// com 3 estados — "new" gira e brilha, "viewed" vira cinza neutro parado, e
// "none" fica só com uma borda discreta. Ver globals.css (.story-ring) pra
// implementação das animações (giro, brilho, ripple, pulso de publicação).
export function StoryRing({
  state,
  storyType,
  size = 64,
  publishing = false,
  children,
}: {
  state: "none" | "new" | "viewed";
  storyType?: StoryContentType | null;
  size?: number;
  publishing?: boolean;
  children: React.ReactNode;
}) {
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const ring = e.currentTarget;
    ring.classList.add("is-pressed");
    const ripple = document.createElement("span");
    ripple.className = "story-ripple";
    ring.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
    setTimeout(() => ring.classList.remove("is-pressed"), 220);
  }

  return (
    <div
      className={`story-ring${publishing ? " is-publishing" : ""}`}
      data-state={state}
      data-pulse={storyType && STORY_TYPE_PULSE.has(storyType) ? "true" : undefined}
      data-shimmer={storyType && STORY_TYPE_SHIMMER.has(storyType) ? "true" : undefined}
      style={{ width: size, height: size }}
      onClick={handleClick}
    >
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-full bg-muted"
        style={{ width: size - 8, height: size - 8 }}
      >
        {children}
      </div>
      {storyType && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-secondary text-brand">
          <StoryTypeIcon type={storyType} className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}
