"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart-context";
import { formatPriceCents } from "@/lib/format";

export function CartPanel({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const { items, incrementQuantity, decrementQuantity, removeItem, clear, totalCents } = useCart();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddressField, setShowAddressField] = useState(false);

  const sellerGroups = useMemo(() => {
    const groups = new Map<string, typeof items>();
    for (const item of items) {
      const list = groups.get(item.product.seller_id) ?? [];
      list.push(item);
      groups.set(item.product.seller_id, list);
    }
    return groups;
  }, [items]);

  async function handleCheckout() {
    if (!isLoggedIn) {
      router.push("/login?redirectTo=/produtos");
      return;
    }

    if (!showAddressField) {
      setShowAddressField(true);
      return;
    }

    if (!address.trim()) {
      setError("Informe o endereço de entrega.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?redirectTo=/produtos");
      return;
    }

    const createdOrderIds: string[] = [];

    for (const [sellerId, groupItems] of sellerGroups) {
      const groupTotal = groupItems.reduce(
        (sum, item) => sum + item.product.price_cents * item.quantity,
        0
      );

      const { data: order, error: orderError } = await createOrder(
        supabase,
        {
          buyer_id: user.id,
          seller_id: sellerId,
          delivery_address: address,
          total_cents: groupTotal,
        },
        groupItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price_cents: item.product.price_cents,
        }))
      );

      if (orderError || !order) {
        setError(orderError?.message ?? "Erro ao criar pedido.");
        setLoading(false);
        return;
      }

      createdOrderIds.push(order.id);
    }

    setLoading(false);
    clear();
    setShowAddressField(false);
    setAddress("");

    if (createdOrderIds.length === 1) {
      router.push(`/pedidos/${createdOrderIds[0]}/rastrear`);
    } else {
      router.push("/pedidos");
    }
  }

  return (
    <aside className="flex w-96 shrink-0 flex-col gap-6 border-l border-border bg-card/40 p-8 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-2xl font-bold">Meu Carrinho</h2>
        <span className="rounded-full bg-brand px-2 py-1 text-xs font-bold text-brand-foreground">
          {items.length} {items.length === 1 ? "item" : "itens"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {items.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">Seu carrinho está vazio.</p>
        )}
        {items.map((item) => (
          <div
            key={item.product.id}
            className="flex items-center gap-4 rounded-2xl border border-border bg-secondary/40 p-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
              {item.product.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.product.photos[0]}
                  alt={item.product.title}
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <span className="text-xl">📦</span>
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold">{item.product.title}</h4>
              <p className="mt-1 font-bold text-brand">
                {formatPriceCents(item.product.price_cents * item.quantity)}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => incrementQuantity(item.product.id)}
                className="h-6 w-6 rounded-md bg-secondary text-xs hover:bg-brand hover:text-brand-foreground"
              >
                +
              </button>
              <span className="text-sm font-medium">{item.quantity}</span>
              <button
                onClick={() =>
                  item.quantity === 1
                    ? removeItem(item.product.id)
                    : decrementQuantity(item.product.id)
                }
                className="h-6 w-6 rounded-md bg-secondary text-xs hover:bg-brand hover:text-brand-foreground"
              >
                −
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="mt-auto flex flex-col gap-4 border-t border-border pt-6">
          {showAddressField && (
            <input
              type="text"
              required
              placeholder="Endereço de entrega"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="rounded-xl border border-input bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatPriceCents(totalCents)}</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-lg">Total</span>
            <span className="text-3xl font-bold text-brand">{formatPriceCents(totalCents)}</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="mt-2 rounded-2xl bg-gradient-to-r from-brand to-primary py-4 font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {loading
              ? "Enviando pedido..."
              : showAddressField
                ? "Confirmar pedido"
                : "Finalizar Compra"}
          </button>
        </div>
      )}
    </aside>
  );
}
