import type { StoryContentType } from "@marketplace/supabase/queries";

export const STORY_TYPES: { value: StoryContentType; label: string }[] = [
  { value: "produto", label: "Produto" },
  { value: "video", label: "Vídeo" },
  { value: "promocao", label: "Promoção" },
  { value: "entrega", label: "Entrega" },
  { value: "local", label: "Local" },
];

// Anel com brilho percorrendo a borda (produto / promoção) ou pulsação
// suave (vídeo / entrega) — local usa só o giro padrão do anel novo.
export const STORY_TYPE_SHIMMER = new Set<StoryContentType>(["produto", "promocao"]);
export const STORY_TYPE_PULSE = new Set<StoryContentType>(["video", "entrega"]);

export function StoryTypeIcon({ type, className }: { type: StoryContentType; className?: string }) {
  const props = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (type) {
    case "produto":
      return (
        <svg {...props}>
          <path d="M6 8h12l-1 12H7L6 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case "video":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M8 6.5v11l9-5.5-9-5.5Z" />
        </svg>
      );
    case "promocao":
      return (
        <svg {...props}>
          <path d="M6 6h.01M18 18h.01M18 6 6 18" />
        </svg>
      );
    case "entrega":
      return (
        <svg {...props}>
          <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
          <circle cx="7" cy="17" r="1.6" />
          <circle cx="17.5" cy="17" r="1.6" />
        </svg>
      );
    case "local":
      return (
        <svg {...props}>
          <path d="M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21Z" />
          <circle cx="12" cy="9.5" r="2.2" />
        </svg>
      );
  }
}
