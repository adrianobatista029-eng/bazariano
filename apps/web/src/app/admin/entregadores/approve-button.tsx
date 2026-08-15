"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ApproveButton({ courierId }: { courierId: string }) {
  const router = useRouter();

  async function handleApprove() {
    const supabase = createClient();
    await supabase.from("couriers").update({ approved: true }).eq("id", courierId);
    router.refresh();
  }

  return (
    <button onClick={handleApprove} className="text-green-400 underline">
      Aprovar
    </button>
  );
}
