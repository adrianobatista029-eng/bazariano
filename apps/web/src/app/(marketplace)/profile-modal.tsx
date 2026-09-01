"use client";

import { useEffect, useRef, useState } from "react";
import { formatCPF } from "@/lib/cpf";

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
  onSaveName,
  onDeleteAccount,
  onUploadAvatar,
  displayName,
  email,
  cpf,
  avatarUrl,
  role,
  memberSince,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  onSaveName: (name: string) => { error: string | null } | undefined | Promise<{ error: string | null } | undefined>;
  onDeleteAccount: () => void | Promise<void>;
  onUploadAvatar: (file: File) => void | Promise<void>;
  displayName: string;
  email: string;
  cpf: string | null;
  avatarUrl: string | null;
  role: string | null;
  memberSince: string | null;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setNameInput(displayName);
      setEditingName(false);
      setNameError(null);
      setConfirmingDelete(false);
    }
  }, [open, displayName]);

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSavingName(true);
    setNameError(null);
    const result = await onSaveName(trimmed);
    setSavingName(false);
    if (result?.error) {
      setNameError(result.error);
      return;
    }
    setEditingName(false);
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    await onDeleteAccount();
    setDeletingAccount(false);
  }

  async function handleAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("A imagem precisa ter até 5MB.");
      return;
    }

    setAvatarError(null);
    setUploadingAvatar(true);
    await onUploadAvatar(file);
    setUploadingAvatar(false);
  }

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/letra-x.png" alt="" className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            aria-label="Escolher foto de perfil"
            title="Escolher foto de perfil"
            className="group relative h-20 w-20 shrink-0"
          >
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
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/50 group-hover:text-white">
              {uploadingAvatar ? "..." : "📷"}
            </span>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarSelected}
              className="hidden"
            />
          </button>
          {avatarError && <p className="text-xs text-destructive">{avatarError}</p>}
          <div className="w-full text-center">
            {editingName ? (
              <div className="flex items-center justify-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  className="w-40 rounded-lg border border-input bg-secondary px-3 py-1.5 text-center text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="rounded-lg bg-brand px-2 py-1.5 text-xs font-semibold text-brand-foreground disabled:opacity-50"
                >
                  {savingName ? "..." : "Salvar"}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="rounded-lg bg-secondary px-2 py-1.5 text-xs text-foreground"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/letra-x.png" alt="" className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
            {editingName && nameError && (
              <p className="mt-1 text-xs text-destructive">{nameError}</p>
            )}
            {!editingName && (
              <p className="flex items-center justify-center gap-2 text-lg font-semibold text-foreground">
                {displayName || "Usuário"}
                <button
                  onClick={() => setEditingName(true)}
                  aria-label="Editar nome"
                  title="Editar nome"
                  className="text-sm text-muted-foreground hover:text-brand"
                >
                  ✏️
                </button>
              </p>
            )}
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
            <dt className="text-muted-foreground">CPF</dt>
            <dd className="text-right font-medium text-foreground">
              {cpf ? formatCPF(cpf) : "Não informado"}
            </dd>
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

        {confirmingDelete ? (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-xs text-destructive">
              Isso remove seus dados pessoais e seus anúncios ficam removidos. Seus pedidos
              continuam existindo (histórico de quem comprou/vendeu com você não é apagado).
              Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-destructive py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {!deletingAccount && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/apagar-mensagem.png" alt="" className="h-5 w-5" />
                )}
                {deletingAccount ? "Apagando..." : "Sim, apagar minha conta"}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg bg-secondary px-3 py-2 text-xs text-foreground"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="mt-3 w-full text-center text-xs text-muted-foreground underline hover:text-destructive"
          >
            Apagar minha conta
          </button>
        )}
      </div>
    </div>
  );
}
