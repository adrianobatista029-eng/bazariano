import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Compre e venda com entrega rastreada",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/produtos" className="text-lg font-semibold text-brand-700">
              Marketplace
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/produtos">Produtos</Link>
              <Link href="/vender">Vender</Link>
              <Link href="/pedidos">Meus pedidos</Link>
              <Link href="/vendas">Minhas vendas</Link>
              <Link href="/login">Entrar</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
