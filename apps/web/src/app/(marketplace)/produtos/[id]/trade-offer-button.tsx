"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTradeOffer } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { formatPriceCents } from "@/lib/format";

type MiniProduct = { id: string; title: string; price_cents: number };

export function TradeOfferButton({
  listingProduct,
  sellerId,
  buyerId,
  myActiveProducts,
}: {
  listingProduct: MiniProduct;
  sellerId: string;
  buyerId: string;
  myActiveProducts: MiniProduct[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [offeredProductId, setOfferedProductId] = useState(myActiveProducts[0]?.id ?? "");
  const [cashAdjustment, setCashAdjustment] = useState("0");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!offeredProductId) {
      setError("Escolha um produto seu para oferecer.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const cashCents = Math.round(parseFloat(cashAdjustment.replace(",", ".") || "0") * 100);

    const { error: insertError } = await createTradeOffer(supabase, {
      listing_product_id: listingProduct.id,
      offered_product_id: offeredProductId,
      buyer_id: buyerId,
      seller_id: sellerId,
      cash_adjustment_cents: cashCents,
      message: message.trim() || null,
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSent(true);
    router.refresh();
  }

  if (myActiveProducts.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-brand px-6 py-3 font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-foreground"
      >
        🔄 Fazer proposta de troca
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Propor troca</h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {sent ? (
              <p className="mt-4 text-sm text-brand">
                Proposta enviada! Acompanhe em "Minhas Trocas".
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Você quer: <strong className="text-foreground">{listingProduct.title}</strong> (
                  {formatPriceCents(listingProduct.price_cents)})
                </p>

                <label className="text-sm font-medium text-foreground">
                  Oferecer em troca
                  <select
                    value={offeredProductId}
                    onChange={(e) => setOfferedProductId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {myActiveProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({formatPriceCents(p.price_cents)})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-foreground">
                  Diferença em dinheiro (R$)
                  <input
                    type="text"
                    value={cashAdjustment}
                    onChange={(e) => setCashAdjustment(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Positivo = você paga a mais. Negativo = você quer receber a mais.
                  </span>
                </label>

                <textarea
                  placeholder="Mensagem (opcional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className="rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />

                {error && <p className="text-sm text-destructive">{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-brand to-primary py-3 font-bold text-primary-foreground shadow-glow disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar proposta"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
