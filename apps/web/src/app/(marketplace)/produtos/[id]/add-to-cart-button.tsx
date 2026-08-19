"use client";

import { useState } from "react";
import type { Database } from "@marketplace/supabase";
import { useCart } from "@/lib/cart-context";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  product_media: Database["public"]["Tables"]["product_media"]["Row"][];
};

export function AddToCartButton({
  product,
  isOwnProduct,
}: {
  product: Product;
  isOwnProduct: boolean;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (isOwnProduct) {
    return (
      <p className="mt-6 rounded-xl border border-border bg-secondary/40 px-6 py-3 text-sm text-muted-foreground">
        Este é o seu produto — você não pode comprá-lo.
      </p>
    );
  }

  return (
    <button
      onClick={handleAdd}
      className="mt-6 rounded-xl bg-gradient-to-r from-brand to-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
    >
      {added ? "Adicionado ✓" : "Adicionar ao carrinho"}
    </button>
  );
}
