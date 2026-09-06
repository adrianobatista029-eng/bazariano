"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@marketplace/supabase";
import { deleteStore } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/lib/confirm-dialog";
import { StoreForm } from "../store-form";
import { StoreProducts } from "../store-products";

type Store = Database["public"]["Tables"]["stores"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"] & {
  product_media: Database["public"]["Tables"]["product_media"]["Row"][];
};

// Só o dono vê esse botão — junta edição dos dados da loja (nome, logo,
// banner...) e upload/organização dos produtos no mesmo painel, em vez de
// espalhar em telas separadas.
export function StoreOwnerPanel({ store, products }: { store: Store; products: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const supabase = createClient();
    const { error } = await deleteStore(supabase, store.id);
    setDeleting(false);

    if (error) {
      // order_items é ON DELETE RESTRICT — se algum produto da loja já foi
      // pedido, o Postgres recusa apagar a cascata inteira.
      setDeleteError(
        error.message.includes("violates foreign key")
          ? "Não dá pra apagar: um ou mais produtos dessa loja já têm pedidos vinculados."
          : "Não foi possível apagar a loja agora."
      );
      setConfirmingDelete(false);
      return;
    }

    router.push("/loja");
    router.refresh();
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
        >
          ⚙️ {open ? "Fechar configurações" : "Configurar loja"}
        </button>
        <button
          onClick={() => setConfirmingDelete(true)}
          className="rounded-full bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-white"
        >
          Excluir loja
        </button>
      </div>

      {deleteError && <p className="mt-2 text-sm text-destructive">{deleteError}</p>}

      {open && (
        <div className="mt-4">
          <StoreForm ownerId={store.owner_id} existingStore={store} onSaved={() => setOpen(false)} />
          <StoreProducts ownerId={store.owner_id} storeId={store.id} products={products} />
        </div>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Apagar esta loja?"
          message="Todos os produtos dessa loja também serão apagados. Essa ação não pode ser desfeita."
          confirmLabel="Apagar loja"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
