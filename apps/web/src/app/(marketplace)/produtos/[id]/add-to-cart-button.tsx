"use client";

import { useState } from "react";
import type { Database } from "@marketplace/supabase";
import { useCart } from "@/lib/cart-context";

type Product = Database["public"]["Tables"]["products"]["Row"];

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
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
