"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@marketplace/supabase";
import { createOrder } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";

type Product = Database["public"]["Tables"]["products"]["Row"];

export function BuyButton({ product }: { product: Product }) {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?redirectTo=/produtos/${product.id}`);
      return;
    }

    const { data: order, error: orderError } = await createOrder(
      supabase,
      {
        buyer_id: user.id,
        seller_id: product.seller_id,
        delivery_address: address,
        total_cents: product.price_cents,
      },
      [{ product_id: product.id, quantity: 1, unit_price_cents: product.price_cents }]
    );

    setLoading(false);

    if (orderError) {
      setError(orderError.message);
      return;
    }

    router.push(`/pedidos/${order!.id}/rastrear`);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 rounded bg-brand-600 px-4 py-2 text-white"
      >
        Comprar
      </button>
    );
  }

  return (
    <form onSubmit={handleBuy} className="mt-6 flex flex-col gap-2">
      <input
        required
        placeholder="Endereço de entrega"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-brand-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Enviando pedido..." : "Confirmar compra"}
      </button>
    </form>
  );
}
