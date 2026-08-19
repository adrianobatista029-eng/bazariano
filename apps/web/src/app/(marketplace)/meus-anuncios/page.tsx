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
      <div className="flex flex-col gap-3">
        {products.map((product) => {
          const cover = product.product_media[0];
          return (
            <div
              key={product.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card/30 p-4 shadow-lg backdrop-blur-md"
            >
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                {cover ? (
                  cover.type === "video" ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={cover.url} className="h-full w-full object-cover" muted />
                  ) : (
                    <Image src={cover.url} alt={product.title} fill className="object-cover" />
                  )
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{product.title}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      product.status === "active"
                        ? "bg-brand/20 text-brand"
                        : product.status === "paused"
                          ? "bg-secondary text-muted-foreground"
                          : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {STATUS_LABEL[product.status] ?? product.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatPriceCents(product.price_cents)} · {product.stock} em estoque
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/meus-anuncios/${product.id}/editar`}
                  className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
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
