"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ModerateButtons({ productId, status }: { productId: string; status: string }) {
  const router = useRouter();

  async function setStatus(newStatus: "active" | "paused" | "removed") {
    const supabase = createClient();
    await supabase.from("products").update({ status: newStatus }).eq("id", productId);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {status !== "active" && (
        <button onClick={() => setStatus("active")} className="text-green-400 underline">
          Ativar
        </button>
      )}
      {status !== "paused" && (
        <button onClick={() => setStatus("paused")} className="text-amber-400 underline">
          Pausar
        </button>
      )}
      {status !== "removed" && (
        <button onClick={() => setStatus("removed")} className="text-red-400 underline">
          Remover
        </button>
      )}
    </div>
  );
}
