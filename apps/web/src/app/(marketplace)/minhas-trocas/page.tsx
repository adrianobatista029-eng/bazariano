import { redirect } from "next/navigation";
import Image from "next/image";
import { listTradeOffersForUser, type TradeOfferRow } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { formatPriceCents } from "@/lib/format";
import { TradeOfferActions } from "./trade-offer-actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Em negociação",
  accepted: "Aceita",
  rejected: "Recusada",
  cancelled: "Cancelada",
};

function ProductChip({ product }: { product: TradeOfferRow["listing_product"] }) {
  if (!product) return null;
  const cover = product.product_media?.[0];
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {cover ? (
          <Image src={cover.url} alt={product.title} fill className="object-cover" />
        ) : (
          <span className="text-lg">📦</span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{product.title}</p>
        <p className="text-xs text-muted-foreground">{formatPriceCents(product.price_cents)}</p>
      </div>
    </div>
  );
}

function OfferCard({ offer, currentUserId }: { offer: TradeOfferRow; currentUserId: string }) {
  const isBuyer = offer.buyer_id === currentUserId;
  const myTurn =
    offer.status === "pending" &&
    ((isBuyer && offer.awaiting_response_from === "buyer") ||
      (!isBuyer && offer.awaiting_response_from === "seller"));

  return (
    <li className="surface-panel p-4">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            offer.status === "accepted"
              ? "bg-brand/20 text-brand"
              : offer.status === "pending"
                ? "bg-secondary text-muted-foreground"
                : "bg-destructive/20 text-destructive"
          }`}
        >
          {STATUS_LABEL[offer.status] ?? offer.status}
        </span>
        {offer.status === "pending" && (
          <span className="text-xs text-muted-foreground">
            {myTurn ? "Sua vez de responder" : "Aguardando a outra parte"}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ProductChip product={isBuyer ? offer.offered_product : offer.listing_product} />
        <span className="text-center text-lg">🔄</span>
        <ProductChip product={isBuyer ? offer.listing_product : offer.offered_product} />
      </div>

      {offer.cash_adjustment_cents !== 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {isBuyer
            ? offer.cash_adjustment_cents > 0
              ? `Você paga mais ${formatPriceCents(offer.cash_adjustment_cents)}`
              : `Você recebe ${formatPriceCents(-offer.cash_adjustment_cents)}`
            : offer.cash_adjustment_cents > 0
              ? `Você recebe mais ${formatPriceCents(offer.cash_adjustment_cents)}`
              : `Você paga ${formatPriceCents(-offer.cash_adjustment_cents)}`}
        </p>
      )}

      {offer.message && <p className="mt-2 text-sm italic text-muted-foreground">"{offer.message}"</p>}

      {myTurn && (
        <TradeOfferActions
          offerId={offer.id}
          cashAdjustmentCents={offer.cash_adjustment_cents}
          isBuyer={isBuyer}
        />
      )}
    </li>
  );
}

export default async function MinhasTrocasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/minhas-trocas");

  const { data: offers, error } = await listTradeOffersForUser(supabase, user.id);

  if (error) {
    return <p className="text-destructive">Erro ao carregar trocas: {error.message}</p>;
  }

  const list = (offers ?? []) as TradeOfferRow[];
  const received = list.filter((o) => o.seller_id === user.id);
  const sent = list.filter((o) => o.buyer_id === user.id);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Minhas Trocas</h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recebidas</h2>
        {received.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma proposta recebida.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {received.map((offer) => (
              <OfferCard key={offer.id} offer={offer} currentUserId={user.id} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Enviadas</h2>
        {sent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma proposta enviada.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sent.map((offer) => (
              <OfferCard key={offer.id} offer={offer} currentUserId={user.id} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
