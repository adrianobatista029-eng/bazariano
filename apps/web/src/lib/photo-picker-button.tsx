"use client";

import { useRef } from "react";

export function PhotoPickerButton({
  onFilesSelected,
  label = "Adicionar fotos e vídeos",
  count,
  max,
}: {
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  count?: number;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const full = max !== undefined && count !== undefined && count >= max;

  return (
    <button
      type="button"
      disabled={full}
      onClick={() => inputRef.current?.click()}
      className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-secondary text-muted-foreground transition-colors hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      <span className="text-sm font-medium">
        {label}
        {max !== undefined && count !== undefined && ` (${count}/${max})`}
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
        onChange={onFilesSelected}
        className="hidden"
      />
    </button>
  );
}
