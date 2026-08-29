"use client";

// Menu de ações de um vídeo da grade de mídia (vender / editar anúncio).
// Fotos abrem o editor direto ao clicar; vídeo não tem editor, só remoção
// (reordenar agora é por arrastar a miniatura, ver use-drag-reorder.ts).
export function MediaThumbnailMenu({
  open,
  onRemove,
  onClose,
}: {
  open: boolean;
  onRemove: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1/2 top-1/2 z-50 w-44 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-1.5 shadow-xl"
      >
        <button
          type="button"
          onClick={() => {
            onRemove();
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
        >
          🗑 Remover
        </button>
      </div>
    </>
  );
}
