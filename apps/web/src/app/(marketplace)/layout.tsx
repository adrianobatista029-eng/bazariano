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
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
    displayName = profile?.full_name ?? user.email ?? "";
  }

  return (
    <CartProvider>
      <MarketplaceShell
        isLoggedIn={!!user}
        isAdmin={isAdmin}
        displayName={displayName}
        email={user?.email ?? ""}
      >
        {children}
      </MarketplaceShell>
    </CartProvider>
  );
}
