import { StatusBadge } from "@marketplace/ui";
import type { OrderStatus } from "@marketplace/supabase";
import { createClient } from "@/lib/supabase/server";
import { formatPriceCents } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";

const VALID_STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false });

  const status = VALID_STATUSES.find((s) => s === searchParams.status);
  if (status) {
    query = query.eq("status", status);
  }

  const { data: orders, error } = await query;

  if (error) return <p className="text-red-600">Erro: {error.message}</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Pedidos</h1>
      <div className="mb-4 flex gap-2 text-sm">
        {Object.entries(ORDER_STATUS_LABEL).map(([status, label]) => (
          <a
            key={status}
            href={`/pedidos?status=${status}`}
            className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
          >
            {label}
          </a>
        ))}
        <a href="/pedidos" className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100">
          Todos
        </a>
      </div>
      <table className="w-full border-collapse overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="p-3">Pedido</th>
            <th className="p-3">Endereço</th>
            <th className="p-3">Total</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders?.map((order) => (
            <tr key={order.id} className="border-t border-slate-100">
              <td className="p-3 font-mono text-xs">{order.id.slice(0, 8)}</td>
              <td className="p-3">{order.delivery_address}</td>
              <td className="p-3">{formatPriceCents(order.total_cents)}</td>
              <td className="p-3">
                <StatusBadge status={order.status} label={ORDER_STATUS_LABEL[order.status]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
