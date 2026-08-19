"use client";

export function StarRating({
  value,
  onChange,
  size = "text-xl",
}: {
  value: number;
  onChange: (value: number) => void;
  size?: string;
}) {
  return (
    <div className={`flex gap-1 ${size}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={n <= value ? "text-brand" : "text-muted-foreground/40"}
          aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
