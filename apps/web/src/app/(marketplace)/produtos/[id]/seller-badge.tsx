"use client";

import { useState } from "react";
import Link from "next/link";
import type { Database } from "@marketplace/supabase";
import { UserProfileModal, type ProfileForModal } from "./user-profile-modal";

type Store = Database["public"]["Tables"]["stores"]["Row"];

// Produto vinculado a uma loja mostra o nome/logo dela em vez do perfil de
// quem vendeu — é a loja que "vende" nesse caso, não a pessoa por trás.
export function SellerBadge({ seller, store }: { seller: ProfileForModal; store: Store | null }) {
  const [open, setOpen] = useState(false);

  if (store) {
    return (
      <Link
        href={`/loja/${store.slug}`}
        className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-card/30 p-3 text-left transition-colors hover:border-brand/50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {store.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: store.primary_color ?? "#f97316" }}
            >
              {store.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Vendido pela loja</p>
          <p className="text-sm font-semibold text-foreground">{store.name}</p>
        </div>
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Vendido por</p>
          <p className="text-sm font-semibold text-foreground">
            {seller.full_name ?? "Vendedor"}
          </p>
        </div>
      </button>

      {open && <UserProfileModal profile={seller} onClose={() => setOpen(false)} />}
    </>
  );
}
