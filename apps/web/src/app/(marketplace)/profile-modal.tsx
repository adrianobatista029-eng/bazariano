"use client";

import { useEffect } from "react";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  buyer_seller: "Comprador/Vendedor",
  courier: "Entregador",
};

function formatMemberSince(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function ProfileModal({
  open,
  onClose,
  onLogout,
  displayName,
  email,
  phone,
  avatarUrl,
  role,
  memberSince,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  displayName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string | null;
  memberSince: string | null;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="surface-panel w-full max-w-sm bg-card p-6 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Meu perfil</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mb-6 flex flex-col items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-20 w-20 rounded-full object-cover ring-4 ring-brand/20"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-2xl font-bold text-brand-foreground ring-4 ring-brand/20">
              {(displayName || email || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{displayName || "Usuário"}</p>
            {role && (
              <span className="mt-1 inline-block rounded-full bg-secondary px-3 py-0.5 text-xs font-medium text-muted-foreground">
                {ROLE_LABEL[role] ?? role}
              </span>
            )}
          </div>
        </div>

        <dl className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="truncate text-right font-medium text-foreground">{email || "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Telefone</dt>
            <dd className="text-right font-medium text-foreground">{phone || "Não informado"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Membro desde</dt>
            <dd className="text-right font-medium text-foreground">{formatMemberSince(memberSince)}</dd>
          </div>
        </dl>

        <button
          onClick={onLogout}
          className="w-full rounded-xl border border-destructive/30 py-3 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}
