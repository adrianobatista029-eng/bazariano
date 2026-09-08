"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createProductComment,
  deleteProductComment,
} from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { formatTimeAgo } from "@/lib/format";
import { ConfirmDialog } from "@/lib/confirm-dialog";
import { UserProfileModal, type ProfileForModal } from "./user-profile-modal";

export type ProductComment = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: ProfileForModal | null;
};

export function ProductComments({
  productId,
  comments,
  currentUserId,
  isOwnProduct,
}: {
  productId: string;
  comments: ProductComment[];
  currentUserId: string | null;
  isOwnProduct: boolean;
}) {
  const router = useRouter();
  const [localComments, setLocalComments] = useState(comments);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<ProfileForModal | null>(null);

  // O router.refresh() traz `comments` atualizado do server component
  // (ex.: com o comentário novo já com o perfil do autor resolvido) —
  // sincroniza o estado local sempre que isso mudar.
  useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  async function handlePost() {
    if (!currentUserId) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    setPosting(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await createProductComment(supabase, {
      product_id: productId,
      author_id: currentUserId,
      body: trimmed,
    });
    if (insertError) {
      setPosting(false);
      setError("Não foi possível enviar o comentário.");
      return;
    }
    setBody("");
    // router.refresh() traz o comentário novo (com o perfil do autor já
    // resolvido pelo server component) — mantém "posting" até ele terminar
    // pra não parecer que o clique não fez nada.
    startTransition(() => router.refresh());
    setPosting(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error: deleteError } = await deleteProductComment(supabase, deleteTarget);
    setDeleting(false);
    if (deleteError) {
      setError("Não foi possível apagar o comentário.");
      return;
    }
    // Some da lista na hora — não precisa esperar o refresh do server pra
    // refletir a exclusão, já sabemos o resultado.
    setLocalComments((current) => current.filter((c) => c.id !== deleteTarget));
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <section className="mt-6 border-t border-border pt-6">
      <h3 className="mb-3 text-lg font-bold text-foreground">
        Comentários {localComments.length > 0 && `(${localComments.length})`}
      </h3>

      {currentUserId ? (
        <div className="mb-4 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePost()}
            placeholder="Tire minha dúvida sobre esse anúncio"
            className="flex-1 rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handlePost}
            disabled={posting || isRefreshing || !body.trim()}
            className="rounded-lg bg-gradient-to-r from-brand to-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">
          <a href="/login" className="text-brand underline">
            Entre
          </a>{" "}
          pra deixar um comentário.
        </p>
      )}

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      {localComments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {localComments.map((c) => {
            const isOwnComment = c.author_id === currentUserId;
            const canOpenProfile = !isOwnComment && !!c.profiles;
            const avatar = (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                {c.profiles?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">
                    {(c.profiles?.full_name ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            );
            return (
              <div key={c.id} className="flex items-start gap-2.5">
                {canOpenProfile ? (
                  <button
                    type="button"
                    onClick={() => setViewingProfile(c.profiles)}
                    aria-label={`Ver perfil de ${c.profiles?.full_name ?? "usuário"}`}
                  >
                    {avatar}
                  </button>
                ) : (
                  avatar
                )}
                <div className="flex-1 rounded-xl bg-secondary/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    {canOpenProfile ? (
                      <button
                        type="button"
                        onClick={() => setViewingProfile(c.profiles)}
                        className="text-xs font-semibold text-foreground hover:underline"
                      >
                        {c.profiles?.full_name ?? "Usuário"}
                      </button>
                    ) : (
                      <p className="text-xs font-semibold text-foreground">
                        {c.profiles?.full_name ?? "Usuário"}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {formatTimeAgo(c.created_at)}
                      </span>
                      {(isOwnComment || isOwnProduct) && (
                        <button
                          onClick={() => setDeleteTarget(c.id)}
                          aria-label="Apagar comentário"
                          className="text-muted-foreground hover:opacity-75"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/apagar-mensagem.png" alt="" className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 select-text text-sm text-foreground">{c.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewingProfile && (
        <UserProfileModal profile={viewingProfile} onClose={() => setViewingProfile(null)} />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Apagar comentário?"
          message="Essa ação não pode ser desfeita."
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
}
