"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createOrder, adjustProductStock } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart-context";
import { formatPriceCents } from "@/lib/format";

export function CartPanel({
  isLoggedIn,
  open,
  onClose,
}: {
  isLoggedIn: boolean;
  open: boolean;
  onClose: () => void;
}) {
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
      setLoading(false);
      router.push("/login?redirectTo=/produtos");
      return;
    }

    if (sellerGroups.has(user.id)) {
      setError(
        "Seu carrinho tem um produto seu. Remova-o (você não pode comprar do seu próprio anúncio) para finalizar a compra."
      );
      setLoading(false);
      return;
    }

    // Reserva o estoque de todo o carrinho antes de criar qualquer pedido —
    // se algum item não tiver estoque suficiente (ex: outro comprador levou
    // primeiro), desfaz as reservas já feitas nesta tentativa e cancela tudo
    // sem criar pedido nenhum. Disparadas em paralelo (em vez de uma de cada
    // vez) já que são independentes entre si — só a decisão de desfazer
    // depende de todas terem respondido.
    const reservationResults = await Promise.all(
      items.map((item) =>
        adjustProductStock(supabase, item.product.id, -item.quantity).then((result) => ({
          item,
          result,
        }))
      )
    );

    const firstFailure = reservationResults.find((r) => !r.result.ok);
    const reserved = new Map(
      reservationResults
        .filter((r) => r.result.ok)
        .map((r) => [r.item.product.id, r.item.quantity])
    );

    if (firstFailure) {
      // Devolve só o que foi reservado com sucesso nesta tentativa — nenhum
      // pedido foi criado ainda, então é seguro desfazer tudo em paralelo.
      await Promise.all(
        Array.from(reserved).map(([productId, quantity]) =>
          adjustProductStock(supabase, productId, quantity)
        )
      );
      setError(`"${firstFailure.item.product.title}": ${firstFailure.result.error}`);
      setLoading(false);
      return;
    }

    // Um pedido por vendedor, criados em paralelo — cada grupo é
    // independente, então uma falha num não precisa esperar os outros.
    const orderResults = await Promise.all(
      Array.from(sellerGroups).map(async ([sellerId, groupItems]) => {
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
        return { groupItems, order, orderError };
      })
    );

    const failedOrder = orderResults.find((r) => r.orderError || !r.order);
    if (failedOrder) {
      // Devolve o estoque só dos grupos que não viraram pedido — os que já
      // foram criados com sucesso continuam valendo.
      const toRollback = orderResults.filter((r) => r.orderError || !r.order);
      await Promise.all(
        toRollback.flatMap((r) =>
          r.groupItems.map((item) => adjustProductStock(supabase, item.product.id, item.quantity))
        )
      );
      setError(failedOrder.orderError?.message ?? "Erro ao criar pedido.");
      setLoading(false);
      return;
    }

    const createdOrderIds = orderResults.map((r) => r.order!.id);

    setLoading(false);
    clear();
    setShowAddressField(false);
    setAddress("");

    if (createdOrderIds.length === 1) {
      router.push(`/pedidos/${createdOrderIds[0]}/rastrear`);
    } else {
      router.push("/pedidos");
    }
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-96 flex-col gap-6 border-l border-border bg-card p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-2xl font-bold">Meu Carrinho</h2>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-brand px-2 py-1 text-xs font-bold text-brand-foreground">
              {items.length} {items.length === 1 ? "item" : "itens"}
            </span>
            <button
              onClick={onClose}
              aria-label="Fechar carrinho"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/letra-x.png" alt="" className="h-4 w-4" />
            </button>
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => {
              clear();
              setShowAddressField(false);
              setError(null);
            }}
            className="self-start text-sm text-muted-foreground underline hover:text-destructive"
          >
            Esvaziar carrinho
          </button>
        )}

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {items.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">Seu carrinho está vazio.</p>
        )}
        {items.map((item) => (
          <div
            key={item.product.id}
            className="flex items-center gap-4 rounded-2xl border border-border bg-secondary/40 p-4"
          >
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-muted">
              {item.product.product_media[0]?.type === "photo" ? (
                <Image
                  src={item.product.product_media[0].url}
                  alt={item.product.title}
                  fill
                  className="object-cover"
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
                disabled={item.quantity >= item.product.stock}
                title={item.quantity >= item.product.stock ? "Sem mais estoque disponível" : undefined}
                className="h-6 w-6 rounded-md bg-secondary text-xs hover:bg-brand hover:text-brand-foreground disabled:opacity-30 disabled:hover:bg-secondary disabled:hover:text-inherit"
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
    </div>
  );
}
