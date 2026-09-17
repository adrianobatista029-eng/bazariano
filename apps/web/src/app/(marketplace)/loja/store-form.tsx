"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createStore, updateStore } from "@marketplace/supabase/queries";
import type { Database } from "@marketplace/supabase";
import { ImageCropModal } from "./image-crop-modal";
import { AddressAutocomplete, geocodeAddress, type StructuredAddress } from "@/lib/address-autocomplete";
import { AddressMapPicker } from "./address-map-picker";

type CropTarget = "logo" | "banner";

type Store = Database["public"]["Tables"]["stores"]["Row"] & {
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type AddressState = {
  street: string | null;
  number: string;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Área clicável de logo/banner: mesmo comportamento (abre o seletor de
// arquivo, mostra a prévia por cima quando já tem imagem), só muda o
// formato (círculo vs retângulo) e o tamanho de cada um.
function ImageUploadField({
  id,
  imageUrl,
  shapeClassName,
  onFile,
}: {
  id: string;
  imageUrl: string | null;
  shapeClassName: string;
  onFile: (file: File) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`group relative flex cursor-pointer items-center justify-center overflow-hidden border border-dashed border-border bg-secondary hover:border-primary ${shapeClassName}`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <ImagePlus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
      )}
      <input
        id={id}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
        className="hidden"
      />
    </label>
  );
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
  const [address, setAddress] = useState<AddressState>({
    street: existingStore?.street ?? null,
    number: existingStore?.number ?? "",
    neighborhood: existingStore?.neighborhood ?? null,
    city: existingStore?.city ?? null,
    state: existingStore?.state ?? null,
    lat: existingStore?.lat ?? null,
    lng: existingStore?.lng ?? null,
  });
  const [logoUrl, setLogoUrl] = useState(existingStore?.logo_url ?? null);
  const [bannerUrl, setBannerUrl] = useState(existingStore?.banner_url ?? null);
  const [primaryColor, setPrimaryColor] = useState(existingStore?.primary_color ?? "#f97316");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cropRequest, setCropRequest] = useState<{ target: CropTarget; file: File } | null>(null);
  // Uma seleção do autocomplete já vem com lat/lng resolvidos — sem essa
  // flag, o efeito de geocodificação abaixo rodaria de novo logo em
  // seguida pra buscar a mesma coordenada que acabamos de receber.
  const justSelectedRef = useRef(false);

  const cleanSlug = slugify(slug);

  function handleNameChange(value: string) {
    setName(value);
    // Endereço nunca é digitado à mão — sempre deriva do nome, na criação
    // e na edição (depois de criado, ele fica travado de qualquer jeito).
    if (!existingStore) setSlug(slugify(value));
  }

  // Abre o modal de recorte em vez de já usar a imagem crua — o usuário
  // arrasta e dá zoom até ficar do jeito que quer, e só então ela vira a
  // logo/banner de verdade (handleCropConfirm).
  function openCropper(target: CropTarget, file: File) {
    setCropRequest({ target, file });
  }

  function handleCropConfirm(dataUrl: string) {
    if (cropRequest?.target === "logo") setLogoUrl(dataUrl);
    if (cropRequest?.target === "banner") setBannerUrl(dataUrl);
    setCropRequest(null);
  }

  function handleSelectAddress(selected: StructuredAddress) {
    justSelectedRef.current = true;
    setAddress({
      street: selected.street,
      number: selected.number ?? "",
      neighborhood: selected.neighborhood,
      city: selected.city,
      state: selected.state,
      lat: selected.lat,
      lng: selected.lng,
    });
  }

  // Recalcula a coordenada exata sempre que o número for confirmado/editado
  // à mão — a sugestão do autocomplete pode não ter interpolado o número
  // certo. Ignora a própria mudança disparada por handleSelectAddress (já
  // veio com coordenada certa) e descarta respostas que chegam fora de
  // ordem (usuário digitando rápido) comparando com o request mais recente.
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    const { street, number, city, state } = address;
    if (!street || !city || !state || !number.trim()) return;

    let cancelled = false;
    const handle = setTimeout(async () => {
      const coords = await geocodeAddress(`${street} ${number}, ${city} - ${state}, Brasil`);
      if (coords && !cancelled) {
        setAddress((a) => ({ ...a, lat: coords.lat, lng: coords.lng }));
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [address.street, address.number, address.city, address.state]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !cleanSlug) {
      setError("Preencha nome e endereço da loja.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: name.trim(),
      slug: cleanSlug,
      street: address.street,
      number: address.number.trim() || null,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      lat: address.lat,
      lng: address.lng,
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

  // Na prévia (e no perfil público) só mostra cidade/UF — o endereço
  // completo é privado, usado só internamente (mapa de entrega etc.).
  const previewAddressLine =
    address.city && address.state ? `${address.city}/${address.state}` : address.city;

  const previewCard = (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/30">
      <div className="flex h-40 w-full items-center justify-center bg-black/40 md:h-56">
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm text-muted-foreground">Sem banner</span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {(name || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-foreground">{name || "Nome da loja"}</h2>
            <p className="truncate text-sm text-muted-foreground">
              bazariano.com/loja/{cleanSlug || "loja-do-joao"}
            </p>
          </div>
        </div>

        {previewAddressLine && (
          <p className="mt-3 text-sm text-muted-foreground">📍 {previewAddressLine}</p>
        )}

        <div className="my-4 h-px bg-border" />

        <p className="text-center text-sm text-muted-foreground">
          Essa loja ainda não tem produtos anunciados.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <form
        onSubmit={handleSubmit}
        className="surface-panel w-full space-y-4 p-6 lg:w-[420px] lg:shrink-0 xl:w-[460px]"
      >
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
              readOnly
              disabled
              placeholder="loja-do-joao"
              className="flex-1 cursor-not-allowed rounded-lg border border-border bg-secondary px-3 py-1.5 text-foreground opacity-60"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Gerado automaticamente a partir do nome{existingStore ? " — não muda depois de criado." : "."}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Localização da loja</label>
          <AddressAutocomplete onSelect={handleSelectAddress} placeholder="Digite o endereço (rua e número)..." />
          {address.street && (
            <input
              value={address.number}
              onChange={(e) => setAddress((a) => ({ ...a, number: e.target.value }))}
              placeholder="Número"
              className="mt-2 w-32 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground"
            />
          )}
          {address.street && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {address.street}
              {address.number ? `, ${address.number}` : ""}
              {address.neighborhood ? ` — ${address.neighborhood}` : ""}
              {address.city ? `, ${address.city}` : ""}
              {address.state ? `/${address.state}` : ""}
            </p>
          )}
          {address.lat != null && address.lng != null && (
            <div className="mt-3">
              <AddressMapPicker
                lat={address.lat}
                lng={address.lng}
                onChange={({ lat, lng }) => setAddress((a) => ({ ...a, lat, lng }))}
              />
            </div>
          )}
        </div>

        <div className="flex gap-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Logo</label>
            <ImageUploadField
              id="logo-upload"
              imageUrl={logoUrl}
              shapeClassName="h-16 w-16 rounded-full"
              onFile={(file) => openCropper("logo", file)}
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
          <ImageUploadField
            id="banner-upload"
            imageUrl={bannerUrl}
            shapeClassName="h-24 w-full rounded-lg"
            onFile={(file) => openCropper("banner", file)}
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

        {cropRequest && (
          <ImageCropModal
            file={cropRequest.file}
            aspect={cropRequest.target === "logo" ? 1 : 16 / 5}
            cropShape={cropRequest.target === "logo" ? "round" : "rect"}
            outputSize={cropRequest.target === "logo" ? 256 : 1200}
            onCancel={() => setCropRequest(null)}
            onConfirm={handleCropConfirm}
          />
        )}
      </form>

      <div className="min-w-0 flex-1">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Pré-visualização da loja
        </h2>
        {previewCard}
      </div>
    </div>
  );
}
