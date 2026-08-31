"use client";

// Card de confirmação com a cara do app (usado no lugar do confirm() nativo
// do navegador) — mesmo visual reaproveitado em qualquer "apagar X?".
export function ConfirmDialog({
  icon = "🗑️",
  title,
  message,
  confirmLabel = "Apagar",
  loading = false,
  onConfirm,
  onCancel,
}: {
  icon?: string;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-card p-5 text-center shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-2xl">{icon}</p>
        <h3 className="mt-2 text-base font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Apagando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
