import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin — Marketplace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-screen">
          <aside className="w-56 border-r border-slate-200 bg-white p-4">
            <p className="mb-6 text-lg font-semibold text-brand-700">Admin</p>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/">Visão geral</Link>
              <Link href="/usuarios">Usuários</Link>
              <Link href="/produtos">Produtos</Link>
              <Link href="/pedidos">Pedidos</Link>
              <Link href="/entregadores">Entregadores</Link>
            </nav>
          </aside>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
