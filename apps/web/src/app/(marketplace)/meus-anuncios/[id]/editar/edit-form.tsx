"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@marketplace/supabase";
import type {
  ProductCondition,
  PackageSize,
  Category,
  Subcategory,
  ListingType,
} from "@marketplace/supabase/queries";
import {
  createProductMedia,
  deleteProductMedia,
  deleteProductMediaFile,
  productMediaPathFromUrl,
  productMediaStoragePath,
  updateProduct,
  updateProductMediaPosition,
  uploadProductMedia,
  listCategoriesWithSubcategories,
} from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_CONDITIONS } from "@/lib/product-condition";
import { PACKAGE_SIZES } from "@/lib/package-size";
import {
  LISTING_TYPES,
  PRICE_LABEL,
  DESCRIPTION_PLACEHOLDER,
  categoryDomain,
  listingTypeDomain,
} from "@/lib/listing-type";
import { DELIVERY_OPTIONS, type DeliveryFlags } from "@/lib/delivery-options";
import { ToggleSwitch } from "@/lib/toggle-switch";
import { PhotoPickerButton } from "@/lib/photo-picker-button";
import { PhotoEditorModal } from "@/lib/photo-editor-modal";
import { MediaThumbnailMenu } from "@/lib/media-thumbnail-menu";
import { useDragReorder } from "@/lib/use-drag-reorder";

const MAX_FILE_MB = 50;
const MAX_VIDEO_SECONDS = 30;
const MAX_MEDIA_ITEMS = 10;
const MIN_MEDIA_ITEMS = 5;

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  product_media: Database["public"]["Tables"]["product_media"]["Row"][];
  condition?: ProductCondition;
  allow_pickup?: boolean;
  allow_delivery?: boolean;
  allow_seller_delivery?: boolean;
  package_size?: PackageSize;
  category_id?: string | null;
  subcategory_id?: string | null;
  listing_type?: ListingType;
  contact_phone?: string | null;
};

type MediaItem =
  | { kind: "existing"; id: string; url: string; type: "photo" | "video" }
  | {
      kind: "new";
      file: File;
      previewUrl: string;
      type: "photo" | "video";
      durationSeconds?: number;
    };

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
  const [listingType, setListingType] = useState<ListingType>(product.listing_type ?? "produto");
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description ?? "");
  const [price, setPrice] = useState((product.price_cents / 100).toFixed(2).replace(".", ","));
  const [stock, setStock] = useState(String(product.stock));
  const [contactPhone, setContactPhone] = useState(product.contact_phone ?? "");
  const [condition, setCondition] = useState<ProductCondition>(product.condition ?? "novo");
  const [packageSize, setPackageSize] = useState<PackageSize>(product.package_size ?? "medio");
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categoryId, setCategoryId] = useState(product.category_id ?? "");
  const [subcategoryId, setSubcategoryId] = useState(product.subcategory_id ?? "");
  const [delivery, setDelivery] = useState<DeliveryFlags>({
    allow_pickup: product.allow_pickup ?? true,
    allow_seller_delivery: product.allow_seller_delivery ?? false,
    allow_delivery: product.allow_delivery ?? true,
  });

  useEffect(() => {
    const supabase = createClient();
    listCategoriesWithSubcategories(supabase).then(({ categories: cats, subcategories: subs }) => {
      setCategories(cats);
      setSubcategories(subs);
      if (!categoryId && cats.length > 0) {
        setCategoryId(cats[0]!.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCategoryChange(newCategoryId: string) {
    setCategoryId(newCategoryId);
    const firstSub = subcategories.find((s) => s.category_id === newCategoryId);
    setSubcategoryId(firstSub?.id ?? "");
  }

  function handleListingTypeChange(newType: ListingType) {
    setListingType(newType);
    const domain = listingTypeDomain(newType);
    const firstMatch = categories.find((c) => categoryDomain(c.name) === domain);
    if (firstMatch) {
      handleCategoryChange(firstMatch.id);
    } else {
      setCategoryId("");
      setSubcategoryId("");
    }
  }
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const { dragIndex, setItemRef, onPointerDown, shouldSuppressClick } = useDragReorder<MediaItem>(setMedia);

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);

    const remainingSlots = MAX_MEDIA_ITEMS - media.length;
    const accepted: MediaItem[] = [];
    for (const file of files) {
      if (accepted.length >= remainingSlots) {
        setError(`Limite de ${MAX_MEDIA_ITEMS} fotos/vídeos por anúncio atingido.`);
        break;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`"${file.name}" passa de ${MAX_FILE_MB}MB e foi ignorado.`);
        continue;
      }
      const isVideo = file.type.startsWith("video/");
      let durationSeconds: number | undefined;
      if (isVideo) {
        try {
          durationSeconds = await readVideoDuration(file);
          if (durationSeconds > MAX_VIDEO_SECONDS) {
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
        durationSeconds,
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

  function handleEditedMedia(index: number, file: File) {
    setMedia((prev) => {
      const item = prev[index];
      if (!item) return prev;
      if (item.kind === "existing") {
        setDeleted((d) => [...d, { id: item.id, url: item.url }]);
      } else {
        URL.revokeObjectURL(item.previewUrl);
      }
      const next = [...prev];
      next[index] = { kind: "new", file, previewUrl: URL.createObjectURL(file), type: "photo" };
      return next;
    });
    setEditingIndex(null);
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

    if (media.length < MIN_MEDIA_ITEMS) {
      setLoading(false);
      setError(`Adicione pelo menos ${MIN_MEDIA_ITEMS} fotos/vídeos.`);
      return;
    }
    if (!media.some((item) => item.type === "video")) {
      setLoading(false);
      setError("Adicione pelo menos 1 vídeo (estilo stories, até 30s).");
      return;
    }
    if (!media.some((item) => item.type === "photo")) {
      setLoading(false);
      setError("Adicione pelo menos uma foto para ser a capa do produto.");
      return;
    }
    if (
      listingType === "produto" &&
      !delivery.allow_pickup &&
      !delivery.allow_seller_delivery &&
      !delivery.allow_delivery
    ) {
      setLoading(false);
      setError("Escolha pelo menos uma opção de entrega.");
      return;
    }
    if (!categoryId) {
      setLoading(false);
      setError("Escolha uma categoria.");
      return;
    }
    if (listingType !== "produto" && !contactPhone.trim()) {
      setLoading(false);
      setError("Informe um telefone de contato.");
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
      listing_type: listingType,
      contact_phone: listingType !== "produto" ? contactPhone.trim() : null,
      condition,
      package_size: packageSize,
      category_id: categoryId,
      subcategory_id: subcategoryId || null,
      allow_pickup: delivery.allow_pickup,
      allow_seller_delivery: delivery.allow_seller_delivery,
      allow_delivery: delivery.allow_delivery,
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
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Tipo de anúncio</label>
        <div className="flex flex-wrap gap-2">
          {LISTING_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleListingTypeChange(t.value)}
              className={
                listingType === t.value
                  ? "rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground"
                  : "rounded-full bg-secondary px-3 py-1.5 text-xs text-foreground"
              }
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>
      <input
        required
        placeholder="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-lg border border-input bg-secondary px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <textarea
        placeholder={DESCRIPTION_PLACEHOLDER[listingType]}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="rounded-lg border border-input bg-secondary px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        rows={4}
      />
      <input
        required
        placeholder={PRICE_LABEL[listingType]}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="rounded-lg border border-input bg-secondary px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {listingType === "produto" && (
        <input
          required
          type="number"
          min={0}
          placeholder="Estoque"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="rounded-lg border border-input bg-secondary px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
      {listingType !== "produto" && (
        <input
          required
          type="tel"
          placeholder="Telefone para contato (WhatsApp)"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          className="rounded-lg border border-input bg-secondary px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Fotos e vídeos — mín. {MIN_MEDIA_ITEMS}, incluindo pelo menos 1 vídeo (até{" "}
          {MAX_VIDEO_SECONDS}s, estilo stories)
        </label>
        <PhotoPickerButton
          onFilesSelected={handleFilesSelected}
          count={media.length}
          max={MAX_MEDIA_ITEMS}
        />
      </div>

      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {media.map((item, index) => (
            <div
              key={item.kind === "existing" ? item.id : item.previewUrl}
              ref={setItemRef(index)}
              role="button"
              tabIndex={0}
              onPointerDown={onPointerDown(index)}
              onClick={() => {
                if (shouldSuppressClick()) return;
                if (item.type === "video") setOpenMenuIndex(index);
                else setEditingIndex(index);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  if (item.type === "video") setOpenMenuIndex(index);
                  else setEditingIndex(index);
                }
              }}
              style={{ touchAction: "none" }}
              className={`relative aspect-square cursor-grab select-none active:cursor-grabbing ${
                dragIndex === index ? "opacity-50" : ""
              }`}
            >
              <div className="absolute inset-0 overflow-hidden rounded-xl border border-border bg-muted">
                {item.type === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={mediaUrl(item)} className="h-full w-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(item)} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-brand-foreground">
                  Capa
                </span>
              )}
              {item.type === "video" && (
                <MediaThumbnailMenu
                  open={openMenuIndex === index}
                  onRemove={() => removeMedia(index)}
                  onClose={() => setOpenMenuIndex(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Categoria</label>
          <select
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {categories
              .filter((c) => categoryDomain(c.name) === listingTypeDomain(listingType))
              .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Subcategoria</label>
          <select
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {subcategories
              .filter((s) => s.category_id === categoryId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {listingType === "produto" && (
        <>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Condição</label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCondition(c.value)}
                  className={
                    condition === c.value
                      ? "rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground"
                      : "rounded-full bg-secondary px-3 py-1.5 text-xs text-foreground"
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Tamanho do pacote
            </label>
            <div className="flex flex-wrap gap-2">
              {PACKAGE_SIZES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPackageSize(p.value)}
                  className={
                    packageSize === p.value
                      ? "rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground"
                      : "rounded-full bg-secondary px-3 py-1.5 text-xs text-foreground"
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            {DELIVERY_OPTIONS.map((opt) => (
              <div key={opt.key} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-foreground">
                  {opt.icon} {opt.label}
                  {opt.recommended && (
                    <span className="ml-1.5 rounded-full bg-brand/20 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                      Recomendado
                    </span>
                  )}
                  <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                </span>
                <ToggleSwitch
                  checked={delivery[opt.key]}
                  onChange={() => setDelivery((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                />
              </div>
            ))}
          </div>
        </>
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

      {editingIndex !== null && media[editingIndex] && (
        <PhotoEditorModal
          imageUrl={mediaUrl(media[editingIndex]!)}
          isCover={editingIndex === 0}
          onCancel={() => setEditingIndex(null)}
          onSave={(file) => handleEditedMedia(editingIndex, file)}
          onSetCover={() => setCover(editingIndex)}
          onRemove={() => removeMedia(editingIndex)}
        />
      )}
    </form>
  );
}
