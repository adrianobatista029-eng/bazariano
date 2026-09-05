"use client";

import { useRouter } from "next/navigation";
import type { UserRole } from "@marketplace/supabase";
import { createClient } from "@/lib/supabase/client";

// 'courier' não é mais uma opção aqui — cadastro de entregador agora
// acontece só no sistema separado (banco/login próprios), nunca promovendo
// um usuário do marketplace por este select.
const ROLES: UserRole[] = ["buyer_seller", "admin"];

export function RoleSelect({ userId, currentRole }: { userId: string; currentRole: UserRole }) {
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ role: e.target.value as UserRole })
      .eq("id", userId);
    router.refresh();
  }

  return (
    <select
      defaultValue={currentRole}
      onChange={handleChange}
      className="rounded-md border border-input bg-secondary px-2 py-1 text-foreground"
    >
      {ROLES.map((role) => (
        <option key={role} value={role}>
          {role}
        </option>
      ))}
    </select>
  );
}
