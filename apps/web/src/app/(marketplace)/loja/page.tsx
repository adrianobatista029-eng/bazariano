import Link from "next/link";
import { redirect } from "next/navigation";
import { getStoreByOwnerId } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { StoreForm } from "./store-form";

export default async function MinhaLojaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/loja");

  const { data: store } = await getStoreByOwnerId(supabase, user.id);

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
    </div>
  );
}
