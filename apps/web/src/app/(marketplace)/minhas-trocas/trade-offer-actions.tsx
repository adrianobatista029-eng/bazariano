"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToTradeOffer } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";

export function TradeOfferActions({
  offerId,
  cashAdjustmentCents,
  isBuyer,
}: {
  offerId: string;
  cashAdjustmentCents: number;
  isBuyer: boolean;
}) {
  const router = useRouter();
  const [countering, setCountering] = useState(false);
  const [cashInput, setCashInput] = useState((cashAdjustmentCents / 100).toFixed(2).replace(".", ","));
  const [message, setMessage] = useState("");
  const [mutating, setMutating] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const loading = mutating || isRefreshing;

  async function act(patch: Parameters<typeof respondToTradeOffer>[2]) {
    setMutating(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await respondToTradeOffer(supabase, offerId, patch);
    setMutating(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    startTransition(() => router.refresh());
  }

  if (countering) {
    return (
      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border p-3">
        <label className="text-xs font-medium text-foreground">
          Nova diferença em dinheiro (R$)
          <input
            type="text"
            value={cashInput}
            onChange={(e) => setCashInput(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <textarea
          placeholder="Mensagem (opcional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="rounded-lg border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button
            disabled={loading}
            onClick={() =>
              act({
                cash_adjustment_cents: Math.round(parseFloat(cashInput.replace(",", ".") || "0") * 100),
                message: message.trim() || null,
                awaiting_response_from: isBuyer ? "seller" : "buyer",
              })
            }
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground disabled:opacity-50"
          >
            Enviar contraproposta
          </button>
          <button
            onClick={() => setCountering(false)}
            className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-foreground"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        disabled={loading}
        onClick={() => act({ status: "accepted" })}
        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground disabled:opacity-50"
      >
        ✅ Aceitar
      </button>
      <button
        disabled={loading}
        onClick={() => act({ status: "rejected" })}
        className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-50"
      >
        ❌ Recusar
      </button>
      <button
        disabled={loading}
        onClick={() => setCountering(true)}
        className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
      >
        🔄 Contraproposta
      </button>
      <button
        disabled={loading}
        onClick={() => act({ status: "cancelled" })}
        className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground underline disabled:opacity-50"
      >
        Cancelar negociação
      </button>
      {error && <p className="w-full text-xs text-destructive">{error}</p>}
    </div>
  );
}
