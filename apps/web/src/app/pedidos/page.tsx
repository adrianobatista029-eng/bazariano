import Link from "next/link";
import { redirect } from "next/navigation";
import { listOrdersAsBuyer } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { formatPriceCents } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";

export default async function PedidosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/pedidos");

  const { data: orders, error } = await listOrdersAsBuyer(supabase, user.id);

  if (error) return <p className="text-red-600">Erro ao carregar pedidos: {error.message}</p>;
  if (!orders?.length) return <p className="text-slate-500">Você ainda não fez pedidos.</p>;

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => (
        <li key={order.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">{ORDER_STATUS_LABEL[order.status]}</span>
            <span className="text-brand-700">{formatPriceCents(order.total_cents)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{order.delivery_address}</p>
          <Link href={`/pedidos/${order.id}/rastrear`} className="mt-2 inline-block text-sm text-brand-700 underline">
            Rastrear entrega
          </Link>
        </li>
      ))}
    </ul>
  );
}
