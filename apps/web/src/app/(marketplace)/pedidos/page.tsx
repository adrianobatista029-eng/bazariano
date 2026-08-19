import Link from "next/link";
import { redirect } from "next/navigation";
import { listOrdersAsBuyer, listReviewsByReviewer } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { formatPriceCents } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { ReviewButton } from "../review-button";

export default async function PedidosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/pedidos");

  const { data: orders, error } = await listOrdersAsBuyer(supabase, user.id);

  if (error) return <p className="text-destructive">Erro ao carregar pedidos: {error.message}</p>;
  if (!orders?.length) return <p className="text-muted-foreground">Você ainda não fez pedidos.</p>;

  const deliveredIds = orders.filter((o) => o.status === "delivered").map((o) => o.id);
  const { data: myReviews } = deliveredIds.length
    ? await listReviewsByReviewer(supabase, deliveredIds, user.id)
    : { data: [] };

  const reviewedKeysByOrder = new Map<string, string[]>();
  for (const r of myReviews ?? []) {
    const key = r.target_type === "product" ? `product:${r.product_id}` : r.target_type;
    const list = reviewedKeysByOrder.get(r.order_id) ?? [];
    list.push(key);
    reviewedKeysByOrder.set(r.order_id, list);
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => (
        <li key={order.id} className="surface-panel p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">{ORDER_STATUS_LABEL[order.status]}</span>
            <span className="text-brand">{formatPriceCents(order.total_cents)}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{order.delivery_address}</p>
          <div className="mt-2 flex items-center gap-4">
            <Link href={`/pedidos/${order.id}/rastrear`} className="text-sm text-primary underline">
              Rastrear entrega
            </Link>
            {order.status === "delivered" && (
              <ReviewButton
                order={order}
                perspective="buyer"
                currentUserId={user.id}
                alreadyReviewedKeys={reviewedKeysByOrder.get(order.id) ?? []}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
