import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { listProductsBySeller } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { formatPriceCents } from "@/lib/format";
import { ListingActions } from "./listing-actions";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  paused: "Pausado",
  removed: "Removido",
};

export default async function MeusAnunciosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/meus-anuncios");

  const { data: products, error } = await listProductsBySeller(supabase, user.id);

  if (error) {
    return <p className="text-destructive">Erro ao carregar seus anúncios: {error.message}</p>;
  }

  if (!products?.length) {
    return <p className="text-muted-foreground">Você ainda não publicou nenhum produto.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Meus Anúncios</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => {
          const cover = product.product_media[0];
          return (
            <div
              key={product.id}
              className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card/30 p-3 shadow-lg backdrop-blur-md"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                {cover ? (
                  cover.type === "video" ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={cover.url} className="h-full w-full object-cover" muted />
                  ) : (
                    <Image src={cover.url} alt={product.title} fill sizes="200px" className="object-cover" />
                  )
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-3xl">📦</span>
                )}
                <span
                  className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-bold shadow-md ${
                    product.status === "active"
                      ? "bg-brand text-brand-foreground"
                      : product.status === "paused"
                        ? "bg-black/70 text-white"
                        : "bg-destructive text-white"
                  }`}
                >
                  {STATUS_LABEL[product.status] ?? product.status}
                </span>
              </div>

              <div>
                <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{product.title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatPriceCents(product.price_cents)} · {product.stock} em estoque
                </p>
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                <Link
                  href={`/meus-anuncios/${product.id}/editar`}
                  className="flex-1 rounded-lg bg-secondary px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
                >
                  Editar
                </Link>
                <ListingActions productId={product.id} status={product.status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
