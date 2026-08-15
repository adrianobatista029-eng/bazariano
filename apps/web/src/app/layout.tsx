import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Compre e venda com entrega rastreada",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <html lang="pt-BR">
      <body>
        <header className="border-b border-border bg-card">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/produtos" className="text-lg font-semibold text-gradient-brand font-display">
              Marketplace
            </Link>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/produtos" className="hover:text-foreground">Produtos</Link>
              <Link href="/vender" className="hover:text-foreground">Vender</Link>
              <Link href="/pedidos" className="hover:text-foreground">Meus pedidos</Link>
              <Link href="/vendas" className="hover:text-foreground">Minhas vendas</Link>
              {isAdmin && (
                <Link href="/admin" className="text-brand hover:text-foreground">
                  Admin
                </Link>
              )}
              <Link href="/login" className="hover:text-foreground">Entrar</Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
