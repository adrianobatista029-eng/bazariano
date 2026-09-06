"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeImageToDataUrl } from "@/lib/image-resize";
import { createStore, updateStore } from "@marketplace/supabase/queries";
import type { Database } from "@marketplace/supabase";

type Store = Database["public"]["Tables"]["stores"]["Row"];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function StoreForm({
  ownerId,
  existingStore,
  onSaved,
}: {
  ownerId: string;
  existingStore: Store | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(existingStore?.name ?? "");
  const [slug, setSlug] = useState(existingStore?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!existingStore);
  const [description, setDescription] = useState(existingStore?.description ?? "");
  const [logoUrl, setLogoUrl] = useState(existingStore?.logo_url ?? null);
  const [bannerUrl, setBannerUrl] = useState(existingStore?.banner_url ?? null);
  const [primaryColor, setPrimaryColor] = useState(existingStore?.primary_color ?? "#f97316");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function handleUploadLogo(file: File) {
    setLogoUrl(await resizeImageToDataUrl(file, 256));
  }

  async function handleUploadBanner(file: File) {
    setBannerUrl(await resizeImageToDataUrl(file, 1200));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanSlug = slugify(slug);
    if (!name.trim() || !cleanSlug) {
      setError("Preencha nome e endereço da loja.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: name.trim(),
      slug: cleanSlug,
      description: description.trim() || null,
      logo_url: logoUrl,
      banner_url: bannerUrl,
      primary_color: primaryColor,
    };

    const { error: saveError } = existingStore
      ? await updateStore(supabase, existingStore.id, payload)
      : await createStore(supabase, { owner_id: ownerId, ...payload });

    setSaving(false);

    if (saveError) {
      setError(
        saveError.message.includes("duplicate") || saveError.message.includes("unique")
          ? "Esse endereço de loja já está em uso — escolha outro."
          : `Não foi possível salvar a loja agora: ${saveError.message}`
      );
      return;
    }

    // Cria (ou muda o endereço numa edição): navega pro slug novo. Edita
    // sem trocar o endereço: só atualiza e fecha o painel no lugar.
    if (!existingStore || existingStore.slug !== cleanSlug) {
      router.push(`/loja/${cleanSlug}`);
    }
    router.refresh();
    onSaved?.();
  }

  return (
    <form onSubmit={handleSubmit} className="surface-panel max-w-xl space-y-4 p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Nome da loja</label>
        <input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Ex: Loja do João"
          className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-foreground"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Endereço da loja</label>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>bazariano.com/loja/</span>
          <input
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(e.target.value);
            }}
            placeholder="loja-do-joao"
            className="flex-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-foreground"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Conte um pouco sobre sua loja"
          className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-foreground"
        />
      </div>

      <div className="flex gap-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Logo</label>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="mb-2 h-16 w-16 rounded-full object-cover" />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleUploadLogo(e.target.files[0])}
            className="text-sm text-muted-foreground"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Cor principal</label>
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-10 w-16 rounded-lg border border-border bg-secondary"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Banner</label>
        {bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerUrl} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleUploadBanner(e.target.files[0])}
          className="text-sm text-muted-foreground"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-primary px-6 py-2.5 font-medium text-primary-foreground shadow-glow disabled:opacity-60"
      >
        {saving ? "Salvando..." : existingStore ? "Salvar alterações" : "Criar loja"}
      </button>
    </form>
  );
}
