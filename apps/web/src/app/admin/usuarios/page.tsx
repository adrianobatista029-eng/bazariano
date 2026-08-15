import { createClient } from "@/lib/supabase/server";
import { RoleSelect } from "./role-select";

export default async function UsuariosPage() {
  const supabase = createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return <p className="text-destructive">Erro: {error.message}</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Usuários</h1>
      <table className="w-full border-collapse overflow-hidden rounded-lg border border-border bg-card text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="p-3">Nome</th>
            <th className="p-3">Telefone</th>
            <th className="p-3">Papel</th>
          </tr>
        </thead>
        <tbody>
          {profiles?.map((profile) => (
            <tr key={profile.id} className="border-t border-border">
              <td className="p-3">{profile.full_name ?? "—"}</td>
              <td className="p-3">{profile.phone ?? "—"}</td>
              <td className="p-3">
                <RoleSelect userId={profile.id} currentRole={profile.role} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
