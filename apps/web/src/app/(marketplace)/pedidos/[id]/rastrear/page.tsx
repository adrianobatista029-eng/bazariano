import { notFound, redirect } from "next/navigation";
import { getOrderById } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { OrderStatusView } from "./order-status-view";

export default async function RastrearPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirectTo=/pedidos/${params.id}/rastrear`);

  const { data: order, error } = await getOrderById(supabase, params.id);

  if (error || !order) notFound();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Pedido #{order.id.slice(0, 8)}</h1>
      <OrderStatusView initialOrder={order} />
    </div>
  );
}
