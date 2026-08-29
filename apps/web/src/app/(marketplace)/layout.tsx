import { createClient } from "@/lib/supabase/server";
import { CartProvider } from "@/lib/cart-context";
import { MarketplaceShell } from "./shell";

export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let displayName = "";
  let cpf: string | null = null;
  let street: string | null = null;
  let number: string | null = null;
  let neighborhood: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let avatarUrl: string | null = null;
  let role: string | null = null;
  let memberSince: string | null = null;
  if (user) {
    // TODO: remover o `as any` depois de rodar `supabase gen types` com as
    // migrations 0007_cpf.sql, 0009_condition_delivery_location.sql e
    // 0010_structured_address.sql aplicadas (esses campos ainda não existem
    // no database.types.ts).
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("role, full_name, cpf, street, number, neighborhood, city, state, avatar_url, created_at")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
    displayName = profile?.full_name ?? user.email ?? "";
    cpf = profile?.cpf ?? null;
    street = profile?.street ?? null;
    number = profile?.number ?? null;
    neighborhood = profile?.neighborhood ?? null;
    city = profile?.city ?? null;
    state = profile?.state ?? null;
    avatarUrl = profile?.avatar_url ?? null;
    role = profile?.role ?? null;
    memberSince = profile?.created_at ?? null;
  }

  return (
    <CartProvider>
      <MarketplaceShell
        isLoggedIn={!!user}
        isAdmin={isAdmin}
        userId={user?.id ?? null}
        displayName={displayName}
        email={user?.email ?? ""}
        cpf={cpf}
        street={street}
        number={number}
        neighborhood={neighborhood}
        city={city}
        state={state}
        avatarUrl={avatarUrl}
        role={role}
        memberSince={memberSince}
      >
        {children}
      </MarketplaceShell>
    </CartProvider>
  );
}
