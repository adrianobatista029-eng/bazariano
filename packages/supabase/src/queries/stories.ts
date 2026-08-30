import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type Client = SupabaseClient<Database>;

export type StoryMediaType = "photo" | "video";
export type StoryContentType = "produto" | "video" | "promocao" | "entrega" | "local";

// TODO: remover os `as any` depois de rodar `supabase gen types` com as
// migrations 0019_stories.sql e 0022_story_type.sql aplicadas.

export function listActiveStories(client: Client) {
  return (client.from as any)("stories")
    .select(
      "id, seller_id, product_id, media_url, media_type, story_type, created_at, products(id, title, price_cents, listing_type, status), profiles(id, full_name, avatar_url)"
    )
    .order("created_at", { ascending: true });
}

export function createStory(
  client: Client,
  story: {
    seller_id: string;
    product_id: string;
    media_url: string;
    media_type: StoryMediaType;
    story_type: StoryContentType;
  }
) {
  return (client.from as any)("stories").insert(story).select().single();
}

export function deleteStory(client: Client, storyId: string) {
  return (client.from as any)("stories").delete().eq("id", storyId);
}

// A url pública é tipo `.../storage/v1/object/public/stories/<path>`; extrai
// só o <path> pra poder apagar o arquivo do bucket.
export function storyMediaPathFromUrl(url: string) {
  const marker = "/stories/";
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

// Apaga uma story do próprio usuário (botão "Apagar", igual Instagram): tira
// o arquivo do Storage e a linha da tabela.
export async function deleteStoryWithMedia(
  client: Client,
  story: { id: string; media_url: string }
) {
  const path = storyMediaPathFromUrl(story.media_url);
  if (path) {
    await client.storage.from("stories").remove([path]);
  }
  return (client.from as any)("stories").delete().eq("id", story.id);
}

// Caminho do arquivo no bucket "stories": a primeira pasta precisa ser o id
// do vendedor (é o que a policy do storage confere contra auth.uid()).
export function storyStoragePath(sellerId: string, fileName: string) {
  const ext = fileName.split(".").pop() ?? "bin";
  return `${sellerId}/${Date.now()}.${ext}`;
}

export async function uploadStoryMedia(client: Client, path: string, file: File) {
  const { error } = await client.storage.from("stories").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { url: null, error };

  const {
    data: { publicUrl },
  } = client.storage.from("stories").getPublicUrl(path);
  return { url: publicUrl, error: null };
}

// Quando o produto vinculado é removido/pausado ou o estoque zera, ou uma
// story completa 24h, um trigger/job no banco (migration
// 0020_stories_cleanup.sql) já apaga a LINHA e enfileira o caminho do
// arquivo em `stories_pending_cleanup` — só o próprio dono consegue apagar o
// arquivo de verdade no Storage (é a regra do bucket), então essa varredura
// roda com a sessão de quem estiver logado, limpando só os arquivos dele.
export async function sweepMyPendingStoryCleanup(client: Client, sellerId: string) {
  const { data, error } = await (client.from as any)("stories_pending_cleanup")
    .select("id, storage_path")
    .eq("seller_id", sellerId);
  if (error || !data || data.length === 0) return;

  const paths = data.map((row: { storage_path: string }) => row.storage_path);
  const ids = data.map((row: { id: string }) => row.id);
  await client.storage.from("stories").remove(paths);
  await (client.from as any)("stories_pending_cleanup").delete().in("id", ids);
}
