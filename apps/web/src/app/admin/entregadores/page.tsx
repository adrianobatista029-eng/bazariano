import { createClient } from "@/lib/supabase/server";
import { ApproveButton } from "./approve-button";

export default async function EntregadoresPage() {
  const supabase = createClient();
  const { data: couriers, error } = await supabase
    .from("couriers")
    .select("*, profiles(full_name, phone)")
    .order("created_at", { ascending: false });

  if (error) return <p className="text-destructive">Erro: {error.message}</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Entregadores</h1>
      <table className="w-full border-collapse overflow-hidden rounded-lg border border-border bg-card text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="p-3">Nome</th>
            <th className="p-3">Veículo</th>
            <th className="p-3">Status</th>
            <th className="p-3">Aprovado</th>
            <th className="p-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {couriers?.map((courier) => (
            <tr key={courier.id} className="border-t border-border">
              <td className="p-3">{courier.profiles?.full_name ?? "—"}</td>
              <td className="p-3">
                {courier.vehicle_type ?? "—"} {courier.vehicle_plate}
              </td>
              <td className="p-3">{courier.status}</td>
              <td className="p-3">{courier.approved ? "Sim" : "Não"}</td>
              <td className="p-3">
                {!courier.approved && <ApproveButton courierId={courier.id} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
