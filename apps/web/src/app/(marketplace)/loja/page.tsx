import Link from "next/link";
import { redirect } from "next/navigation";
import { listStoresByOwner, MAX_STORES_PER_OWNER } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function MinhasLojasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/loja");

  const { data: stores } = await listStoresByOwner(supabase, user.id);
  const myStores = stores ?? [];
  const canCreateMore = myStores.length < MAX_STORES_PER_OWNER;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Minhas lojas</h1>
      <p className="mb-6 text-muted-foreground">
        Cada loja é uma vitrine própria dentro do Bazariano, com seus próprios produtos.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {myStores.map((store) => (
          <Link
            key={store.id}
            href={`/loja/${store.slug}`}
            className="group flex flex-col gap-2.5 rounded-2xl border border-border bg-card/30 p-3 shadow-lg backdrop-blur-md transition-all hover:border-brand/50 hover:bg-card/50"
          >
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-muted">
              {store.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
                  style={{ backgroundColor: store.primary_color ?? "#f97316" }}
                >
                  {store.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <h4 className="line-clamp-2 text-sm font-semibold text-foreground">{store.name}</h4>
          </Link>
        ))}

        {canCreateMore && (
          <Link
            href="/loja/nova"
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-3 text-muted-foreground transition-colors hover:border-brand hover:text-brand"
          >
            <span className="text-3xl">+</span>
            <span className="text-center text-sm font-medium">Nova loja</span>
          </Link>
        )}
      </div>

      {myStores.length === 0 && (
        <p className="mt-6 text-muted-foreground">
          Você ainda não tem nenhuma loja — crie a primeira pra começar a vender por vitrine própria.
        </p>
      )}
    </div>
  );
}
