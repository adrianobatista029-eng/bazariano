import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type Client = SupabaseClient<Database>;

export type Category = { id: string; name: string; sort_order: number };
export type Subcategory = { id: string; category_id: string; name: string; sort_order: number };

// TODO: remover os `as any` depois de rodar `supabase gen types` com a
// migration 0012_categories.sql aplicada (tabelas ainda não existem no
// database.types.ts).
export async function listCategoriesWithSubcategories(client: Client) {
  const [{ data: categories, error: catError }, { data: subcategories, error: subError }] =
    await Promise.all([
      (client.from as any)("categories").select("id, name, sort_order").order("sort_order"),
      (client.from as any)("subcategories")
        .select("id, category_id, name, sort_order")
        .order("sort_order"),
    ]);

  return {
    categories: (categories ?? []) as Category[],
    subcategories: (subcategories ?? []) as Subcategory[],
    error: catError ?? subError ?? null,
  };
}
