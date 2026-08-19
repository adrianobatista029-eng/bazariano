import Link from "next/link";
import { ThemeToggle } from "@/lib/theme-toggle";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-57px)]">
      <aside className="w-56 border-r border-sidebar-border bg-sidebar p-4">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-lg font-semibold text-gradient-brand font-display">Admin</p>
          <ThemeToggle />
        </div>
        <nav className="flex flex-col gap-2 text-sm text-sidebar-foreground/70">
          <Link href="/admin" className="hover:text-sidebar-foreground">
            Visão geral
          </Link>
          <Link href="/admin/usuarios" className="hover:text-sidebar-foreground">
            Usuários
          </Link>
          <Link href="/admin/produtos" className="hover:text-sidebar-foreground">
            Produtos
          </Link>
          <Link href="/admin/pedidos" className="hover:text-sidebar-foreground">
            Pedidos
          </Link>
          <Link href="/admin/entregadores" className="hover:text-sidebar-foreground">
            Entregadores
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
