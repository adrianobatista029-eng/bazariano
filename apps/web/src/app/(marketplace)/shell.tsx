"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sweepMyPendingStoryCleanup } from "@marketplace/supabase/queries";
import { useCart } from "@/lib/cart-context";
import { ThemeToggle } from "@/lib/theme-toggle";
import { resizeImageToDataUrl } from "@/lib/image-resize";
import { CartPanel } from "./cart-panel";
import { ProfileModal } from "./profile-modal";
import { CategoryMenu } from "./produtos/category-menu";

const NAV_ITEMS = [
  { href: "/produtos", label: "Início", icon: "/botao-home.png" },
  { href: "/vender", label: "Vender", icon: "/etiqueta-de-venda.png" },
  { href: "/meus-anuncios", label: "Meus Anúncios", icon: "/tarefa.png" },
  { href: "/minhas-trocas", label: "Minhas Trocas", icon: "/troca.png" },
  { href: "/pedidos", label: "Meus Pedidos", icon: "/produtos.png" },
  { href: "/vendas", label: "Minhas Vendas", icon: "/crescimento-do-dinheiro.png", whiteBg: true },
];

// Alguns itens usam emoji, outros (como "Início") um ícone de imagem
// customizado — detecta pelo caminho começando com "/" pra saber qual
// renderizar.
function NavIcon({ icon, className }: { icon: string; className?: string }) {
  if (icon.startsWith("/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={icon} alt="" className={className ?? "h-5 w-5"} />;
  }
  return <>{icon}</>;
}

export function MarketplaceShell({
  children,
  isLoggedIn,
  isAdmin,
  userId,
  displayName,
  email,
  cpf,
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
  const [fabOpen, setFabOpen] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const showWelcomeBanner =
    !welcomeDismissed && !avatarUrl && searchParams.get("welcome") === "1";

  // Stories apagadas (expiraram, o anúncio saiu ou o estoque zerou) só têm a
  // linha removida no banco — o arquivo no Storage só o próprio dono pode
  // apagar. Varre a fila pendente dele silenciosamente sempre que acessa o
  // marketplace logado.
  useEffect(() => {
    if (!userId) return;
    sweepMyPendingStoryCleanup(createClient(), userId);
  }, [userId]);

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

  const fabActions = isAdmin
    ? [...NAV_ITEMS, { href: "/admin", label: "Admin", icon: "🛠️" }]
    : NAV_ITEMS;

  const sidebarContent = (
    <>
      <Link href="/produtos" className="flex items-center p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bazariano-wordmark.png" alt="Bazariano" className="wordmark-crisp h-9 w-auto" />
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
              <span
                className={`flex h-10 w-10 items-center justify-center text-3xl ${
                  item.whiteBg ? "rounded-full bg-white" : ""
                }`}
              >
                <NavIcon icon={item.icon} className="h-10 w-10" />
              </span>{" "}
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-xl p-3 text-brand transition-colors hover:bg-secondary"
          >
            <span className="flex h-10 w-10 items-center justify-center text-3xl">🛠️</span> Admin
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

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-4 flex flex-wrap items-center gap-4 md:mb-5">
          {pathname === "/produtos" && (
            <>
              <Link href="/produtos" className="order-1 flex shrink-0 items-center md:hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/bazariano-wordmark.png" alt="Bazariano" className="wordmark-crisp h-5 w-auto" />
              </Link>

              <div className="order-2 ml-auto flex items-center gap-3 md:order-3 md:gap-4">
                  <CategoryMenu />
                  <ThemeToggle size="h-9 w-9 text-lg md:h-12 md:w-12 md:text-2xl" />
                  <button
                    onClick={() => setCartOpen(true)}
                    title="Carrinho"
                    aria-label="Carrinho"
                    className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:border-brand hover:text-brand md:h-12 md:w-12"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/carrinho-de-compras.png" alt="" className="icon-crisp h-5 w-5 md:h-8 md:w-8" />
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
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:border-brand hover:text-brand md:h-12 md:w-12"
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
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="icon-crisp h-5 w-5 md:h-7 md:w-7"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      )}
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="whitespace-nowrap rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-glow md:px-5 md:py-2 md:text-base"
                    >
                      Entrar
                    </Link>
                  )}
                </div>

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
            </>
          )}
        </header>

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/letra-x.png" alt="" className="h-3.5 w-3.5" />
            </span>
          </button>
        )}

        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          onLogout={handleLogout}
          onSaveName={handleSaveName}
          onDeleteAccount={handleDeleteAccount}
          onUploadAvatar={handleUploadAvatar}
          displayName={displayName}
          email={email}
          cpf={cpf}
          avatarUrl={avatarUrl}
          role={role}
          memberSince={memberSince}
        />

        {children}
      </main>

      {/* Cart panel (overlay) */}
      <CartPanel isLoggedIn={isLoggedIn} open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Botão flutuante (mobile) — atalho rápido pras mesmas seções do menu
          hambúrguer, sem precisar abrir a gaveta lateral. */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 md:hidden"
          onClick={() => setFabOpen(false)}
        />
      )}
      <div
        className="pointer-events-none fixed z-50 flex flex-col items-end gap-3 md:hidden"
        style={{ right: "1rem", bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {fabActions.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setFabOpen(false)}
            className="pointer-events-auto flex items-center gap-3 transition-all duration-200 ease-out"
            style={{
              transitionDelay: fabOpen ? `${index * 30}ms` : "0ms",
              opacity: fabOpen ? 1 : 0,
              transform: fabOpen
                ? "translateY(0) scale(1)"
                : "translateY(12px) scale(0.85)",
              visibility: fabOpen ? "visible" : "hidden",
            }}
          >
            <span className="whitespace-nowrap rounded-full bg-card/90 px-3 py-1.5 text-sm font-medium text-foreground shadow-md ring-1 ring-border">
              {item.label}
            </span>
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-card text-2xl shadow-elevated ring-1 ring-border">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  item.whiteBg ? "bg-white" : ""
                }`}
              >
                <NavIcon icon={item.icon} className="h-12 w-12" />
              </span>
            </span>
          </Link>
        ))}
        <button
          onClick={() => setFabOpen((v) => !v)}
          aria-label={fabOpen ? "Fechar atalhos" : "Abrir atalhos"}
          aria-expanded={fabOpen}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full shadow-glow transition-transform duration-200 ease-out"
          style={{ transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sinal-de-mais.png" alt="" className="h-14 w-14" />
        </button>
      </div>
    </div>
  );
}
