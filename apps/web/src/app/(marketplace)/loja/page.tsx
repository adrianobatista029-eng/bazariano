import Link from "next/link";
import { redirect } from "next/navigation";
import { getStoreByOwnerId, listProductsBySeller } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { StoreForm } from "./store-form";
import { StoreProducts } from "./store-products";

export default async function MinhaLojaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/loja");

  const { data: store } = await getStoreByOwnerId(supabase, user.id);
  const { data: allProducts } = await listProductsBySeller(supabase, user.id);
  const storeProducts = (allProducts ?? []).filter((p) => p.in_store && p.status !== "removed");

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">{store ? "Minha loja" : "Criar minha loja"}</h1>
      <p className="mb-6 text-muted-foreground">
        {store
          ? "Edite as informações públicas da sua loja."
          : "Monte uma vitrine própria dentro do Bazariano com seus produtos."}
      </p>

      {store && (
        <Link
          href={`/loja/${store.slug}`}
          className="mb-4 inline-block text-sm text-brand underline"
        >
          Ver minha loja pública →
        </Link>
      )}

      <StoreForm ownerId={user.id} existingStore={store ?? null} />

      {store && <StoreProducts ownerId={user.id} products={storeProducts} />}
    </div>
  );
}
