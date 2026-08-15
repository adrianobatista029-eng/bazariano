import Link from "next/link";
import { listActiveProducts } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { formatPriceCents } from "@/lib/format";

export default async function ProdutosPage() {
  const supabase = createClient();
  const { data: products, error } = await listActiveProducts(supabase);

  if (error) {
    return <p className="text-destructive">Erro ao carregar produtos: {error.message}</p>;
  }

  if (!products?.length) {
    return <p className="text-muted-foreground">Nenhum produto disponível ainda.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {products.map((product) => (
        <Link
          key={product.id}
          href={`/produtos/${product.id}`}
          className="surface-panel p-4 transition-shadow hover:shadow-elevated"
        >
          <div className="mb-2 aspect-square w-full rounded-lg bg-muted">
            {product.photos[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.photos[0]}
                alt={product.title}
                className="h-full w-full rounded-lg object-cover"
              />
            )}
          </div>
          <h2 className="font-medium">{product.title}</h2>
          <p className="text-brand">{formatPriceCents(product.price_cents)}</p>
        </Link>
      ))}
    </div>
  );
}
