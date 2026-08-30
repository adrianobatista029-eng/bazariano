"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProduct } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";

export function ListingActions({
  productId,
  status,
}: {
  productId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(next: "active" | "paused" | "removed") {
    setLoading(true);
    const supabase = createClient();
    await updateProduct(supabase, productId, { status: next });
    setLoading(false);
    router.refresh();
  }

  if (status === "removed") {
    return (
      <button
        onClick={() => setStatus("active")}
        disabled={loading}
        className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground disabled:opacity-50"
      >
        Restaurar
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setStatus(status === "active" ? "paused" : "active")}
        disabled={loading}
        className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground disabled:opacity-50"
      >
        {status === "active" ? "Pausar" : "Reativar"}
      </button>
      <button
        onClick={() => {
          if (confirm("Remover este anúncio? Ele deixa de aparecer para compradores.")) {
            setStatus("removed");
          }
        }}
        disabled={loading}
        className="flex-1 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-white disabled:opacity-50"
      >
        Remover
      </button>
    </>
  );
}
