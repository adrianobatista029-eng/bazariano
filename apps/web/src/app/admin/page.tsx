import { createClient } from "@/lib/supabase/server";

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const [{ count: usersCount }, { count: productsCount }, { count: ordersCount }, { count: pendingCouriers }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("couriers").select("*", { count: "exact", head: true }).eq("approved", false),
    ]);

  const cards = [
    { label: "Usuários", value: usersCount ?? 0 },
    { label: "Produtos ativos", value: productsCount ?? 0 },
    { label: "Pedidos totais", value: ordersCount ?? 0 },
    { label: "Entregadores pendentes", value: pendingCouriers ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Visão geral</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="surface-panel p-4">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
