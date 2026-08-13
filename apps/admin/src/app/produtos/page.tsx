import { createClient } from "@/lib/supabase/server";
import { formatPriceCents } from "@/lib/format";
import { ModerateButtons } from "./moderate-buttons";

export default async function ProdutosPage() {
  const supabase = createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return <p className="text-red-600">Erro: {error.message}</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Produtos</h1>
      <table className="w-full border-collapse overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="p-3">Título</th>
            <th className="p-3">Preço</th>
            <th className="p-3">Estoque</th>
            <th className="p-3">Status</th>
            <th className="p-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {products?.map((product) => (
            <tr key={product.id} className="border-t border-slate-100">
              <td className="p-3">{product.title}</td>
              <td className="p-3">{formatPriceCents(product.price_cents)}</td>
              <td className="p-3">{product.stock}</td>
              <td className="p-3">{product.status}</td>
              <td className="p-3">
                <ModerateButtons productId={product.id} status={product.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
