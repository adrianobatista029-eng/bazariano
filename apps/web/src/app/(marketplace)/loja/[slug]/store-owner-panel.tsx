"use client";

import { useState } from "react";
import type { Database } from "@marketplace/supabase";
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
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
      >
        ⚙️ {open ? "Fechar configurações" : "Configurar loja"}
      </button>

      {open && (
        <div className="mt-4">
          <StoreForm ownerId={store.owner_id} existingStore={store} onSaved={() => setOpen(false)} />
          <StoreProducts ownerId={store.owner_id} storeId={store.id} products={products} />
        </div>
      )}
    </div>
  );
}
