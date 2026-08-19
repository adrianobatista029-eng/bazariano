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
  let phone: string | null = null;
  let avatarUrl: string | null = null;
  let role: string | null = null;
  let memberSince: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, phone, avatar_url, created_at")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
    displayName = profile?.full_name ?? user.email ?? "";
    phone = profile?.phone ?? null;
    avatarUrl = profile?.avatar_url ?? null;
    role = profile?.role ?? null;
    memberSince = profile?.created_at ?? null;
  }

  return (
    <CartProvider>
      <MarketplaceShell
        isLoggedIn={!!user}
        isAdmin={isAdmin}
        displayName={displayName}
        email={user?.email ?? ""}
        phone={phone}
        avatarUrl={avatarUrl}
        role={role}
        memberSince={memberSince}
      >
        {children}
      </MarketplaceShell>
    </CartProvider>
  );
}
