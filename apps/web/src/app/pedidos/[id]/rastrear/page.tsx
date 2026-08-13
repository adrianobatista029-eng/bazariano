import { notFound, redirect } from "next/navigation";
import { getOrderById } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { TrackingMap } from "./tracking-map";

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
      <p className="mb-4 text-slate-500">{ORDER_STATUS_LABEL[order.status]}</p>

      {order.courier_id && ["picked_up", "delivering"].includes(order.status) ? (
        <TrackingMap
          courierId={order.courier_id}
          destination={
            order.delivery_lat && order.delivery_lng
              ? { lat: order.delivery_lat, lng: order.delivery_lng }
              : null
          }
        />
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
          O mapa fica disponível assim que o entregador coletar o pedido.
        </p>
      )}
    </div>
  );
}
