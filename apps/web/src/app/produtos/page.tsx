import Link from "next/link";
import { listActiveProducts } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { formatPriceCents } from "@/lib/format";

export default async function ProdutosPage() {
  const supabase = createClient();
  const { data: products, error } = await listActiveProducts(supabase);

  if (error) {
    return <p className="text-red-600">Erro ao carregar produtos: {error.message}</p>;
  }

  if (!products?.length) {
    return <p className="text-slate-500">Nenhum produto disponível ainda.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {products.map((product) => (
        <Link
          key={product.id}
          href={`/produtos/${product.id}`}
          className="rounded-lg border border-slate-200 bg-white p-4 hover:shadow"
        >
          <div className="mb-2 aspect-square w-full rounded bg-slate-100">
            {product.photos[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.photos[0]}
                alt={product.title}
                className="h-full w-full rounded object-cover"
              />
            )}
          </div>
          <h2 className="font-medium">{product.title}</h2>
          <p className="text-brand-700">{formatPriceCents(product.price_cents)}</p>
        </Link>
      ))}
    </div>
  );
}
