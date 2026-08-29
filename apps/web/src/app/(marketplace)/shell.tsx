"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart-context";
import { ThemeToggle } from "@/lib/theme-toggle";
import { resizeImageToDataUrl } from "@/lib/image-resize";
import type { StructuredAddress } from "@/lib/address-autocomplete";
import { CartPanel } from "./cart-panel";
import { ProfileModal } from "./profile-modal";
import { InstallAppBanner } from "@/lib/install-app-banner";

const NAV_ITEMS = [
  { href: "/produtos", label: "Início", icon: "🏠" },
  { href: "/vender", label: "Vender", icon: "🏷️" },
  { href: "/meus-anuncios", label: "Meus Anúncios", icon: "📋" },
  { href: "/minhas-trocas", label: "Minhas Trocas", icon: "🔄" },
  { href: "/pedidos", label: "Meus Pedidos", icon: "📦" },
  { href: "/vendas", label: "Minhas Vendas", icon: "💰" },
];

export function MarketplaceShell({
  children,
  isLoggedIn,
  isAdmin,
  userId,
  displayName,
  email,
  cpf,
  street,
  number,
  neighborhood,
  city,
  state,
  avatarUrl,
  role,
  memberSince,
}: {
  children: React.ReactNode;
  isLoggedIn: boolean;
  isAdmin: boolean;
  userId: string | null;
  displayName: string;
  email: string;
  cpf: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  avatarUrl: string | null;
  role: string | null;
  memberSince: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { itemCount } = useCart();
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const showWelcomeBanner =
    !welcomeDismissed && !avatarUrl && searchParams.get("welcome") === "1";

  function dismissWelcomeBanner() {
    setWelcomeDismissed(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("welcome");
    router.replace(params.size ? `${pathname}?${params}` : pathname);
  }

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

  async function handleSaveName(name: string) {
    if (!userId) return { error: "Não autenticado." };
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", userId);
    if (error) return { error: error.message };
    router.refresh();
    return { error: null };
  }

  async function handleSaveLocation(address: StructuredAddress) {
    if (!userId) return { error: "Não autenticado." };
    const supabase = createClient();
    const { error } = await (supabase.from("profiles") as any)
      .update({
        street: address.street,
        number: address.number,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        lat: address.lat,
        lng: address.lng,
      })
      .eq("id", userId);
    if (error) return { error: error.message };
    router.refresh();
    return { error: null };
  }

  async function handleUploadAvatar(file: File) {
    if (!userId) return;
    const dataUrl = await resizeImageToDataUrl(file);
    const supabase = createClient();
    await supabase.from("profiles").update({ avatar_url: dataUrl }).eq("id", userId);
    router.refresh();
  }

  async function handleDeleteAccount() {
    if (!userId) return;
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ full_name: "Usuário removido", phone: null, avatar_url: null })
      .eq("id", userId);
    await supabase.from("products").update({ status: "removed" }).eq("seller_id", userId);
    await supabase.auth.signOut();
    router.push("/login?accountDeleted=1");
    router.refresh();
  }

  const sidebarContent = (
    <>
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
              onClick={() => setMobileNavOpen(false)}
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
            onClick={() => setMobileNavOpen(false)}
            className="flex items-center gap-3 rounded-xl p-3 text-brand transition-colors hover:bg-secondary"
          >
            <span className="text-lg">🛠️</span> Admin
          </Link>
        )}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col gap-8 border-r border-border bg-card/40 p-6 shadow-xl backdrop-blur-md md:flex">
        {sidebarContent}
      </aside>

      {/* Sidebar (mobile drawer) */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-black/50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        >
          <aside
            className="flex w-72 max-w-[85vw] flex-col gap-8 border-r border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-bold">Menu</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Fechar menu"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                ✕
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-6 flex flex-wrap items-center gap-4 md:mb-8">
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-foreground md:hidden"
          >
            ☰
          </button>

          {pathname === "/produtos" && (
            <>
              <form
                onSubmit={handleSearch}
                className="relative order-3 w-full md:order-none md:w-auto md:flex-1 md:max-w-xl"
              >
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar produtos no AllRotaHub..."
                  className="w-full rounded-full border border-border bg-secondary px-6 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </form>

              <div className="ml-auto flex items-center gap-4">
                <ThemeToggle />
                <button
                  onClick={() => setCartOpen(true)}
                  title="Carrinho"
                  aria-label="Carrinho"
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:border-brand hover:text-brand"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                  {itemCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                      {itemCount}
                    </span>
                  )}
                </button>
                {isLoggedIn ? (
                  <button
                    onClick={() => setProfileOpen(true)}
                    title="Minha conta"
                    aria-label="Minha conta"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:border-brand hover:text-brand"
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    )}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-full bg-primary px-5 py-2 font-medium text-primary-foreground shadow-glow"
                  >
                    Entrar
                  </Link>
                )}
              </div>
            </>
          )}
        </header>

        {pathname === "/produtos" && <InstallAppBanner />}

        {showWelcomeBanner && (
          <button
            onClick={() => {
              setProfileOpen(true);
              dismissWelcomeBanner();
            }}
            className="mb-6 flex w-full items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-left transition-colors hover:bg-brand/15"
          >
            <span className="text-sm font-medium text-foreground">
              📷 Conta criada! Que tal adicionar uma foto de perfil?
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                dismissWelcomeBanner();
              }}
              role="button"
              aria-label="Dispensar"
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </span>
          </button>
        )}

        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          onLogout={handleLogout}
          onSaveName={handleSaveName}
          onSaveLocation={handleSaveLocation}
          onDeleteAccount={handleDeleteAccount}
          onUploadAvatar={handleUploadAvatar}
          displayName={displayName}
          email={email}
          cpf={cpf}
          street={street}
          number={number}
          neighborhood={neighborhood}
          city={city}
          state={state}
          avatarUrl={avatarUrl}
          role={role}
          memberSince={memberSince}
        />

        {children}
      </main>

      {/* Cart panel (overlay) */}
      <CartPanel isLoggedIn={isLoggedIn} open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
