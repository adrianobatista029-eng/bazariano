import { redirect } from "next/navigation";
import { listStoresByOwner, MAX_STORES_PER_OWNER } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { StoreForm } from "../store-form";

export default async function NovaLojaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/loja/nova");

  const { data: stores } = await listStoresByOwner(supabase, user.id);
  // Trava silenciosa: sem o botão "+ Nova loja" na grade já não chega
  // aqui, mas confere de novo do lado do servidor por segurança.
  if ((stores ?? []).length >= MAX_STORES_PER_OWNER) redirect("/loja");

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Criar nova loja</h1>
      <p className="mb-6 text-muted-foreground">
        Monte uma vitrine própria dentro do Bazariano com seus produtos.
      </p>

      <StoreForm ownerId={user.id} existingStore={null} />
    </div>
  );
}
