import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "./product-card";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (searchParams.q) {
    query = query.ilike("title", `%${searchParams.q}%`);
  }

  const { data: products, error } = await query;

  if (error) {
    return <p className="text-destructive">Erro ao carregar produtos: {error.message}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="relative flex items-center justify-between overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-card to-card/40 p-8 shadow-lg">
        <div className="z-10">
          <h2 className="mb-2 font-display text-3xl font-bold">
            {searchParams.q ? `Resultados para "${searchParams.q}"` : "Bem-vindo ao AllRotaHub"}
          </h2>
          <p className="text-muted-foreground">
            {searchParams.q
              ? `${products?.length ?? 0} produto(s) encontrado(s)`
              : "Compre e venda com entrega rastreada em tempo real"}
          </p>
        </div>
        <div className="z-10 text-7xl opacity-80">🛍️</div>
        <div className="absolute right-0 top-0 h-full w-64 rounded-full bg-brand/10 blur-3xl" />
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between">
          <h3 className="text-2xl font-bold">
            {searchParams.q ? "Resultados" : "Produtos disponíveis"}
          </h3>
        </div>

        {!products?.length ? (
          <p className="text-muted-foreground">Nenhum produto disponível.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
