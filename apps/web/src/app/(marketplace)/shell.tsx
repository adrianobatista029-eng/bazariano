"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CartPanel } from "./cart-panel";

const NAV_ITEMS = [
  { href: "/produtos", label: "Início", icon: "🏠" },
  { href: "/vender", label: "Vender", icon: "🏷️" },
  { href: "/pedidos", label: "Meus Pedidos", icon: "📦" },
  { href: "/vendas", label: "Minhas Vendas", icon: "💰" },
];

export function MarketplaceShell({
  children,
  isLoggedIn,
  isAdmin,
  displayName,
  email,
}: {
  children: React.ReactNode;
  isLoggedIn: boolean;
  isAdmin: boolean;
  displayName: string;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(search.trim() ? `/produtos?q=${encodeURIComponent(search.trim())}` : "/produtos");
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col gap-8 border-r border-border bg-card/40 p-6 shadow-xl backdrop-blur-md">
        <Link href="/produtos" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-bold text-brand-foreground shadow-glow">
            A
          </div>
          <span className="font-display text-xl font-bold tracking-wide">AllRotaHub</span>
        </Link>

        <nav className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "flex items-center gap-3 rounded-xl bg-primary p-3 font-medium text-primary-foreground shadow-md"
                    : "flex items-center gap-3 rounded-xl p-3 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                }
              >
                <span className="text-lg">{item.icon}</span> {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-xl p-3 text-brand transition-colors hover:bg-secondary"
            >
              <span className="text-lg">🛠️</span> Admin
            </Link>
          )}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8 flex items-center justify-between gap-6">
          <form onSubmit={handleSearch} className="relative w-full max-w-xl">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produtos no AllRotaHub..."
              className="w-full rounded-full border border-border bg-secondary px-6 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </form>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-3 rounded-full border border-border bg-secondary px-4 py-2"
                >
                  <span className="text-sm font-medium">Olá, {displayName || "usuário"}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {(displayName || email || "?").charAt(0).toUpperCase()}
                  </div>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-12 z-20 w-48 rounded-xl border border-border bg-card p-2 shadow-elevated">
                    <p className="truncate px-2 py-1 text-xs text-muted-foreground">{email}</p>
                    <button
                      onClick={handleLogout}
                      className="w-full rounded-lg px-2 py-2 text-left text-sm text-destructive hover:bg-secondary"
                    >
                      Sair da conta
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-primary px-5 py-2 font-medium text-primary-foreground shadow-glow"
              >
                Entrar
              </Link>
            )}
          </div>
        </header>

        {children}
      </main>

      {/* Cart panel */}
      <CartPanel isLoggedIn={isLoggedIn} />
    </div>
  );
}
