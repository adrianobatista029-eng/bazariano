"use client";

// Anel de destaque do Stories (identidade própria: dourado → magenta → roxo),
// com 3 estados — "new" gira e brilha, "viewed" vira cinza neutro parado, e
// "none" fica só com uma borda discreta. Ver globals.css (.story-ring) pra
// implementação das animações (giro, brilho, ripple, pulso de publicação).
export function StoryRing({
  state,
  size = 64,
  publishing = false,
  children,
}: {
  state: "none" | "new" | "viewed";
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
      style={{ width: size, height: size }}
      onClick={handleClick}
    >
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-full bg-muted"
        style={{ width: size - 8, height: size - 8 }}
      >
        {children}
      </div>
    </div>
  );
}
