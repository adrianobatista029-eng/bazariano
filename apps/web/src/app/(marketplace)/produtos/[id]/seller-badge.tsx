"use client";

import { useState } from "react";
import { getSellerPublicStats, type SellerStats } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { REVIEW_TAGS } from "@/lib/review-config";

type SellerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

const TAG_LABEL = Object.fromEntries(
  Object.values(REVIEW_TAGS)
    .flat()
    .map((t) => [t.code, t.label])
);

export function SellerBadge({ seller }: { seller: SellerProfile }) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  async function openModal() {
    setOpen(true);
    if (stats || loadingStats) return;
    setLoadingStats(true);
    const supabase = createClient();
    const { data } = await getSellerPublicStats(supabase, seller.id);
    setStats(data);
    setLoadingStats(false);
  }

  const memberSince = new Date(seller.created_at).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-card/30 p-3 text-left transition-colors hover:border-brand/50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {seller.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={seller.avatar_url} alt={seller.full_name ?? ""} className="h-full w-full object-cover" />
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
              className="text-muted-foreground"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Vendido por</p>
          <p className="text-sm font-semibold text-foreground">
            {seller.full_name ?? "Vendedor"}
          </p>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Perfil do vendedor</h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center gap-3 text-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted">
                {seller.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={seller.avatar_url}
                    alt={seller.full_name ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted-foreground"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {seller.full_name ?? "Vendedor"}
                </p>
                <p className="text-sm text-muted-foreground">Membro desde {memberSince}</p>
              </div>

              <div className="mt-2 grid w-full grid-cols-2 gap-2">
                <div className="rounded-xl bg-secondary/40 py-3">
                  <p className="text-2xl font-bold text-brand">
                    {loadingStats ? "…" : (stats?.completed_orders ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">pedidos concluídos</p>
                </div>
                <div className="rounded-xl bg-secondary/40 py-3">
                  <p className="text-2xl font-bold text-brand">
                    {loadingStats ? "…" : stats && stats.total_reviews > 0 ? `★ ${stats.avg_rating}` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.total_reviews ?? 0} avaliaç{stats?.total_reviews === 1 ? "ão" : "ões"}
                  </p>
                </div>
              </div>

              {stats && stats.top_tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {stats.top_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground"
                    >
                      {TAG_LABEL[tag] ?? tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
