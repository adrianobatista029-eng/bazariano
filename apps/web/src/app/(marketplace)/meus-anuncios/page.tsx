import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { listProductsBySeller } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { formatPriceCents } from "@/lib/format";
import { ListingActions } from "./listing-actions";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  paused: "Pausado",
  removed: "Removido",
};

export default async function MeusAnunciosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/meus-anuncios");

  const { data: products, error } = await listProductsBySeller(supabase, user.id);

  if (error) {
    return <p className="text-destructive">Erro ao carregar seus anúncios: {error.message}</p>;
  }

  if (!products?.length) {
    return <p className="text-muted-foreground">Você ainda não publicou nenhum produto.</p>;
  }

  // Produto vendido não pode ser removido enquanto o pedido ainda está em
  // andamento (o comprador pode estar esperando a entrega) — só libera de
  // novo quando entregue ou cancelado (cancelado nunca vai "entregar", então
  // travar o apagar pra sempre nesse caso deixaria o anúncio preso).
  const soldOutIds = products
    .filter((p) => {
      const listingType = (p as any).listing_type ?? "produto";
      return p.status === "active" && listingType === "produto" && p.stock <= 0;
    })
    .map((p) => p.id);

  const pendingDeliveryIds = new Set<string>();
  if (soldOutIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, order_id")
      .in("product_id", soldOutIds);
    const orderIds = [...new Set((items ?? []).map((i) => i.order_id))];
    if (orderIds.length > 0) {
      const { data: relatedOrders } = await supabase.from("orders").select("id, status").in("id", orderIds);
      const statusByOrderId = new Map((relatedOrders ?? []).map((o) => [o.id, o.status]));
      for (const item of items ?? []) {
        const status = statusByOrderId.get(item.order_id);
        if (status && status !== "delivered" && status !== "cancelled") {
          pendingDeliveryIds.add(item.product_id);
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Meus Anúncios</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => {
          const cover = product.product_media[0];
          // TODO: remover o `as any` depois de rodar `supabase gen types` com
          // a migration 0013_listing_type.sql aplicada.
          const listingType = (product as any).listing_type ?? "produto";
          const isSoldOut = product.status === "active" && listingType === "produto" && product.stock <= 0;
          return (
            <div
              key={product.id}
              className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card/30 p-3 shadow-lg backdrop-blur-md"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                {cover ? (
                  cover.type === "video" ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={cover.url} className="h-full w-full object-cover" muted />
                  ) : (
                    <Image src={cover.url} alt={product.title} fill sizes="200px" className="object-cover" />
                  )
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-3xl">📦</span>
                )}
                <span
                  className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-bold shadow-md ${
                    isSoldOut
                      ? "bg-gradient-to-r from-brand to-primary text-primary-foreground"
                      : product.status === "active"
                        ? "bg-brand text-brand-foreground"
                        : product.status === "paused"
                          ? "bg-black/70 text-white"
                          : "bg-destructive text-white"
                  }`}
                >
                  {isSoldOut ? "Vendido" : (STATUS_LABEL[product.status] ?? product.status)}
                </span>
              </div>

              <div>
                <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{product.title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatPriceCents(product.price_cents)} · {product.stock} em estoque
                </p>
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                {!isSoldOut && (
                  <Link
                    href={`/meus-anuncios/${product.id}/editar`}
                    className="flex-1 rounded-lg bg-secondary px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
                  >
                    Editar
                  </Link>
                )}
                {isSoldOut && (
                  <Link
                    href="/vendas"
                    className="flex-1 rounded-lg bg-gradient-to-r from-brand to-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground shadow-glow"
                  >
                    Ver venda
                  </Link>
                )}
                <ListingActions
                  productId={product.id}
                  status={product.status}
                  isSoldOut={isSoldOut}
                  canDelete={!pendingDeliveryIds.has(product.id)}
                  inStore={product.in_store}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
