"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProduct, deleteProductCompletely } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/lib/confirm-dialog";

type Dialog = { kind: "confirm" } | { kind: "info"; message: string } | null;

export function ListingActions({
  productId,
  status,
}: {
  productId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);

  async function setStatus(next: "active" | "paused" | "removed") {
    setLoading(true);
    const supabase = createClient();
    await updateProduct(supabase, productId, { status: next });
    setLoading(false);
    router.refresh();
  }

  async function confirmDelete() {
    setLoading(true);
    const supabase = createClient();
    const result = await deleteProductCompletely(supabase, productId);
    setLoading(false);

    if (result.blocked) {
      setDialog({
        kind: "info",
        message:
          "Esse anúncio já tem pedidos vinculados, então não pode ser apagado do banco — foi só removido da vitrine.",
      });
      await setStatus("removed");
      return;
    }
    if (!result.deleted) {
      setDialog({ kind: "info", message: `Não foi possível apagar o anúncio: ${result.error}` });
      return;
    }
    setDialog(null);
    router.refresh();
  }

  const dialogOverlay =
    dialog &&
    (dialog.kind === "confirm" ? (
      <ConfirmDialog
        title="Apagar anúncio?"
        message="Essa ação é definitiva e não pode ser desfeita."
        loading={loading}
        onConfirm={confirmDelete}
        onCancel={() => setDialog(null)}
      />
    ) : (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
        onClick={() => setDialog(null)}
      >
        <div
          className="w-full max-w-sm rounded-2xl bg-card p-5 text-center shadow-elevated"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-foreground">{dialog.message}</p>
          <button
            onClick={() => setDialog(null)}
            className="mt-4 w-full rounded-xl bg-secondary py-2.5 text-sm font-medium text-foreground"
          >
            Entendi
          </button>
        </div>
      </div>
    ));

  if (status === "removed") {
    return (
      <button
        onClick={() => setStatus("active")}
        disabled={loading}
        className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground disabled:opacity-50"
      >
        Restaurar
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setStatus(status === "active" ? "paused" : "active")}
        disabled={loading}
        className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground disabled:opacity-50"
      >
        {status === "active" ? "Pausar" : "Reativar"}
      </button>
      <button
        onClick={() => setDialog({ kind: "confirm" })}
        disabled={loading}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-white disabled:opacity-50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/apagar-mensagem.png" alt="" className="h-6 w-6" />
        Remover
      </button>
      {dialogOverlay}
    </>
  );
}
