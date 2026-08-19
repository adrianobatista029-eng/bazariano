"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@marketplace/supabase";
import {
  createProductMedia,
  deleteProductMedia,
  deleteProductMediaFile,
  productMediaPathFromUrl,
  productMediaStoragePath,
  updateProduct,
  updateProductMediaPosition,
  uploadProductMedia,
} from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_MB = 50;
const MAX_VIDEO_SECONDS = 30;

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  product_media: Database["public"]["Tables"]["product_media"]["Row"][];
};

type MediaItem =
  | { kind: "existing"; id: string; url: string; type: "photo" | "video" }
  | { kind: "new"; file: File; previewUrl: string; type: "photo" | "video" };

function mediaUrl(item: MediaItem) {
  return item.kind === "existing" ? item.url : item.previewUrl;
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => reject(new Error("Não foi possível ler o vídeo."));
    video.src = URL.createObjectURL(file);
  });
}

export function EditListingForm({ product }: { product: Product }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description ?? "");
  const [price, setPrice] = useState((product.price_cents / 100).toFixed(2).replace(".", ","));
  const [stock, setStock] = useState(String(product.stock));
  const [media, setMedia] = useState<MediaItem[]>(
    product.product_media.map((m) => ({
      kind: "existing",
      id: m.id,
      url: m.url,
      type: m.type as "photo" | "video",
    }))
  );
  const [deleted, setDeleted] = useState<{ id: string; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);

    const accepted: MediaItem[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`"${file.name}" passa de ${MAX_FILE_MB}MB e foi ignorado.`);
        continue;
      }
      const isVideo = file.type.startsWith("video/");
      if (isVideo) {
        try {
          const duration = await readVideoDuration(file);
          if (duration > MAX_VIDEO_SECONDS) {
            setError(`"${file.name}" passa de ${MAX_VIDEO_SECONDS}s e foi ignorado.`);
            continue;
          }
        } catch {
          setError(`Não foi possível ler "${file.name}".`);
          continue;
        }
      }
      accepted.push({
        kind: "new",
        file,
        previewUrl: URL.createObjectURL(file),
        type: isVideo ? "video" : "photo",
      });
    }

    setMedia((prev) => [...prev, ...accepted]);
  }

  function removeMedia(index: number) {
    setMedia((prev) => {
      const item = prev[index];
      if (!item) return prev;
      if (item.kind === "existing") {
        setDeleted((d) => [...d, { id: item.id, url: item.url }]);
      } else {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function moveMedia(index: number, direction: -1 | 1) {
    setMedia((prev) => {
      const next = [...prev];
      const target = index + direction;
      const a = next[index];
      const b = next[target];
      if (!a || !b) return prev;
      next[index] = b;
      next[target] = a;
      return next;
    });
  }

  function setCover(index: number) {
    setMedia((prev) => {
      const item = prev[index];
      if (!item || item.type !== "photo") return prev;
      const rest = prev.filter((_, i) => i !== index);
      return [item, ...rest];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?redirectTo=/meus-anuncios/${product.id}/editar`);
      return;
    }

    if (media.length > 0 && !media.some((item) => item.type === "photo")) {
      setLoading(false);
      setError("Adicione pelo menos uma foto para ser a capa do produto.");
      return;
    }

    let orderedMedia = media;
    if (media.length > 0 && media[0]?.type === "video") {
      const firstPhotoIndex = media.findIndex((item) => item.type === "photo");
      if (firstPhotoIndex > 0) {
        const firstPhoto = media[firstPhotoIndex]!;
        orderedMedia = [firstPhoto, ...media.filter((_, i) => i !== firstPhotoIndex)];
      }
    }

    const priceCents = Math.round(parseFloat(price.replace(",", ".")) * 100);

    const { error: updateError } = await updateProduct(supabase, product.id, {
      title,
      description,
      price_cents: priceCents,
      stock: parseInt(stock, 10),
    });

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    for (const item of deleted) {
      await deleteProductMedia(supabase, item.id);
      const path = productMediaPathFromUrl(item.url);
      if (path) await deleteProductMediaFile(supabase, path);
    }

    for (const [i, item] of orderedMedia.entries()) {
      if (item.kind === "existing") {
        await updateProductMediaPosition(supabase, item.id, i);
        continue;
      }
      setStatus(`Enviando mídia ${i + 1} de ${orderedMedia.length}...`);
      const path = productMediaStoragePath(user.id, product.id, item.file.name, i);
      const { url, error: uploadError } = await uploadProductMedia(supabase, path, item.file);
      if (uploadError || !url) {
        setError(`Falha ao enviar "${item.file.name}", pulando esse arquivo.`);
        continue;
      }
      await createProductMedia(supabase, [
        { product_id: product.id, url, type: item.type, position: i },
      ]);
    }

    setStatus(null);
    setLoading(false);
    router.push("/meus-anuncios");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        required
        placeholder="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-lg border border-input bg-secondary px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <textarea
        placeholder="Descrição"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="rounded-lg border border-input bg-secondary px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        rows={4}
      />
      <input
        required
        placeholder="Preço (ex: 49,90)"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="rounded-lg border border-input bg-secondary px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        required
        type="number"
        min={0}
        placeholder="Estoque"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        className="rounded-lg border border-input bg-secondary px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Fotos e vídeos (vídeos até {MAX_VIDEO_SECONDS}s, estilo stories)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          onChange={handleFilesSelected}
          className="w-full rounded-lg border border-dashed border-input bg-secondary px-3 py-4 text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
        />
      </div>

      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {media.map((item, index) => (
            <div
              key={item.kind === "existing" ? item.id : item.previewUrl}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
            >
              {item.type === "video" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={mediaUrl(item)} className="h-full w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(item)} alt="" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-between bg-black/0 p-1 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white"
                >
                  ✕
                </button>
                <div className="flex gap-1">
                  {item.type === "photo" && index !== 0 && (
                    <button
                      type="button"
                      onClick={() => setCover(index)}
                      title="Definir como capa"
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs"
                    >
                      ★
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => moveMedia(index, -1)}
                    disabled={index === 0}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => moveMedia(index, 1)}
                    disabled={index === media.length - 1}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              </div>
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-brand-foreground">
                  Capa
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-glow disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
