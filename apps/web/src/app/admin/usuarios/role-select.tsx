"use client";

import { useRouter } from "next/navigation";
import type { UserRole } from "@marketplace/supabase";
import { createClient } from "@/lib/supabase/client";

const ROLES: UserRole[] = ["buyer_seller", "admin", "courier"];

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
