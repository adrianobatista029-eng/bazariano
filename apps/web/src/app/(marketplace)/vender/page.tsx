"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ProductCondition,
  PackageSize,
  Category,
  Subcategory,
  ListingType,
} from "@marketplace/supabase/queries";
import {
  createProduct,
  createProductMedia,
  productMediaStoragePath,
  uploadProductMedia,
  listCategoriesWithSubcategories,
} from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { formatPriceCents } from "@/lib/format";
import { PRODUCT_CONDITIONS, PRODUCT_CONDITION_LABEL } from "@/lib/product-condition";
import { PACKAGE_SIZES, PACKAGE_SIZE_LABEL } from "@/lib/package-size";
import {
  LISTING_TYPES,
  PRICE_LABEL,
  PRICE_DISPLAY_SUFFIX,
  DESCRIPTION_PLACEHOLDER,
  categoryDomain,
  listingTypeDomain,
} from "@/lib/listing-type";
import { DELIVERY_OPTIONS, type DeliveryFlags } from "@/lib/delivery-options";
import { AddressAutocomplete, geocodeAddress, type StructuredAddress } from "@/lib/address-autocomplete";
import { upscaleToFullHdIfNeeded } from "@/lib/image-resize";
import { ToggleSwitch } from "@/lib/toggle-switch";
import { PhotoPickerButton } from "@/lib/photo-picker-button";
import { PhotoEditorModal } from "@/lib/photo-editor-modal";
import { MediaThumbnailMenu } from "@/lib/media-thumbnail-menu";
import { useDragReorder } from "@/lib/use-drag-reorder";

const MAX_FILE_MB = 50;
const MAX_VIDEO_SECONDS = 30;
const MAX_MEDIA_ITEMS = 10;
const MIN_MEDIA_ITEMS = 5;

type PendingMedia = {
  file: File;
  previewUrl: string;
  type: "photo" | "video";
  durationSeconds?: number;
};

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

export default function VenderPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [listingType, setListingType] = useState<ListingType>("produto");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [contactPhone, setContactPhone] = useState("");
  const [condition, setCondition] = useState<ProductCondition>("novo");
  const [packageSize, setPackageSize] = useState<PackageSize>("medio");
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [delivery, setDelivery] = useState<DeliveryFlags>({
    allow_pickup: true,
    allow_seller_delivery: false,
    allow_delivery: true,
  });
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [street, setStreet] = useState<string | null>(null);
  const [addressNumber, setAddressNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [stateUf, setStateUf] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const { dragIndex, setItemRef, onPointerDown, shouldSuppressClick } = useDragReorder<PendingMedia>(setMedia);

  useEffect(() => {
    const supabase = createClient();
    listCategoriesWithSubcategories(supabase).then(({ categories: cats, subcategories: subs }) => {
      setCategories(cats);
      setSubcategories(subs);
      if (cats.length > 0) {
        setCategoryId(cats[0]!.id);
        const firstSub = subs.find((s) => s.category_id === cats[0]!.id);
        if (firstSub) setSubcategoryId(firstSub.id);
      }
    });
  }, []);

  function handleSelectAddress(address: StructuredAddress) {
    setStreet(address.street);
    setAddressNumber(address.number ?? "");
    setNeighborhood(address.neighborhood);
    setCity(address.city);
    setStateUf(address.state);
    setLat(address.lat);
    setLng(address.lng);
  }

  // Recalcula a coordenada exata sempre que o número for confirmado/editado —
  // a sugestão do autocomplete pode não ter interpolado o número certo, e a
  // localização precisa ser exata pra calcular a rota de entrega depois.
  useEffect(() => {
    if (!street || !city || !stateUf || !addressNumber.trim()) return;
    const handle = setTimeout(async () => {
      const coords = await geocodeAddress(`${street} ${addressNumber}, ${city} - ${stateUf}, Brasil`);
      if (coords) {
        setLat(coords.lat);
        setLng(coords.lng);
      }
    }, 600);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [street, addressNumber, city, stateUf]);

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

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);

    const remainingSlots = MAX_MEDIA_ITEMS - media.length;
    const accepted: PendingMedia[] = [];
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
            setError(
              `"${file.name}" passa de ${MAX_VIDEO_SECONDS}s (vídeos são tipo stories, curtinhos) e foi ignorado.`
            );
            continue;
          }
        } catch {
          setError(`Não foi possível ler "${file.name}".`);
          continue;
        }
      }
      const finalFile = isVideo ? file : await upscaleToFullHdIfNeeded(file);
      accepted.push({
        file: finalFile,
        previewUrl: URL.createObjectURL(finalFile),
        type: isVideo ? "video" : "photo",
        durationSeconds,
      });
    }

    setMedia((prev) => [...prev, ...accepted]);
  }

  function removeMedia(index: number) {
    setMedia((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleEditedMedia(index: number, file: File) {
    setMedia((prev) => {
      const item = prev[index];
      if (!item) return prev;
      URL.revokeObjectURL(item.previewUrl);
      const next = [...prev];
      next[index] = { ...item, file, previewUrl: URL.createObjectURL(file) };
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

  function orderedMediaForSubmit() {
    if (media.length === 0 || media[0]?.type !== "video") return media;
    const firstPhotoIndex = media.findIndex((item) => item.type === "photo");
    if (firstPhotoIndex <= 0) return media;
    const firstPhoto = media[firstPhotoIndex]!;
    return [firstPhoto, ...media.filter((_, i) => i !== firstPhotoIndex)];
  }

  function validate(): string | null {
    const priceCents = Math.round(parseFloat(price.replace(",", ".")) * 100);
    if (!title.trim() || !price.trim() || Number.isNaN(priceCents)) {
      return "Preencha título e preço antes de publicar.";
    }
    if (!categoryId) {
      return "Escolha uma categoria.";
    }
    if (!street || !city || !stateUf) {
      return "Informe o endereço do anúncio.";
    }
    if (!addressNumber.trim()) {
      return "Informe o número do endereço — precisamos da localização exata pra calcular a rota de entrega depois.";
    }
    if (listingType !== "produto" && !contactPhone.trim()) {
      return "Informe um telefone de contato.";
    }
    if (
      listingType === "produto" &&
      !delivery.allow_pickup &&
      !delivery.allow_seller_delivery &&
      !delivery.allow_delivery
    ) {
      return "Escolha pelo menos uma opção de entrega.";
    }
    if (media.length < MIN_MEDIA_ITEMS) {
      return `Adicione pelo menos ${MIN_MEDIA_ITEMS} fotos/vídeos.`;
    }
    if (!media.some((item) => item.type === "video")) {
      return "Adicione pelo menos 1 vídeo (estilo stories, até 30s).";
    }
    if (!media.some((item) => item.type === "photo")) {
      return "Adicione pelo menos uma foto para ser a capa do produto.";
    }
    return null;
  }

  function handleAdvance(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    setError(validationError);
    if (validationError) return;
    setStep(2);
  }

  async function handlePublish() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?redirectTo=/vender");
      return;
    }

    const orderedMedia = orderedMediaForSubmit();
    const priceCents = Math.round(parseFloat(price.replace(",", ".")) * 100);

    const { data: product, error: createError } = await createProduct(supabase, {
      seller_id: user.id,
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
      street,
      number: addressNumber.trim() || null,
      neighborhood,
      city,
      state: stateUf,
      lat,
      lng,
    });

    if (createError || !product) {
      setLoading(false);
      setError(createError?.message ?? "Erro ao publicar produto.");
      return;
    }

    if (orderedMedia.length > 0) {
      const mediaRows = [];
      for (const [i, item] of orderedMedia.entries()) {
        setUploadStatus(`Enviando mídia ${i + 1} de ${orderedMedia.length}...`);
        const path = productMediaStoragePath(user.id, product.id, item.file.name, i);
        const { url, error: uploadError } = await uploadProductMedia(supabase, path, item.file);
        if (uploadError || !url) {
          setError(`Falha ao enviar "${item.file.name}", pulando esse arquivo.`);
          continue;
        }
        mediaRows.push({ product_id: product.id, url, type: item.type, position: i });
      }
      setUploadStatus(null);
      if (mediaRows.length > 0) {
        await createProductMedia(supabase, mediaRows);
      }
    }

    setLoading(false);
    router.push(`/produtos/${product.id}`);
  }

  const cover = media[0];
  const addressLabel =
    street && city && stateUf
      ? `${street}${addressNumber ? `, ${addressNumber}` : ""}${
          neighborhood ? ` - ${neighborhood}` : ""
        }, ${city}/${stateUf}`
      : "Endereço não informado";
  const priceCentsPreview = price ? Math.round(parseFloat(price.replace(",", ".")) * 100) : null;
  const activeDeliveryOptions = DELIVERY_OPTIONS.filter((opt) => delivery[opt.key]);

  const mediaPickerField = (
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
  );

  const mediaGrid = media.length > 0 && (
    <div className="grid grid-cols-3 gap-2">
      {media.map((item, index) => (
        <div
          key={item.previewUrl}
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
              <video src={item.previewUrl} className="h-full w-full object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
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
  );

  const categorySubcategories = subcategories.filter((s) => s.category_id === categoryId);
  const filteredCategories = categories.filter(
    (c) => categoryDomain(c.name) === listingTypeDomain(listingType)
  );

  const categoryField = (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Categoria</label>
        <select
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {filteredCategories.map((c) => (
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
          {categorySubcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const conditionField = (
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
  );

  const packageSizeField = (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">Tamanho do pacote</label>
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
  );

  const addressField = (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">Endereço do anúncio</label>
      <AddressAutocomplete onSelect={handleSelectAddress} placeholder="Digite o endereço (rua e número)..." />
      {street && (
        <div className="mt-2 flex gap-2">
          <input
            required
            type="text"
            placeholder="Número"
            value={addressNumber}
            onChange={(e) => setAddressNumber(e.target.value)}
            className="w-24 shrink-0 rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="flex items-center text-sm text-muted-foreground">
            {street}
            {neighborhood ? ` - ${neighborhood}` : ""}, {city}/{stateUf}
          </p>
        </div>
      )}
    </div>
  );

  const deliveryField = (
    <div className="rounded-lg border border-border p-3">
      {DELIVERY_OPTIONS.map((opt) => (
        <div key={opt.key} className="flex items-center justify-between gap-3 py-2">
          <span className="text-sm text-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
              {opt.recommended && (
                <span className="rounded-full bg-brand/20 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                  Recomendado
                </span>
              )}
            </span>
            <span className="block text-xs text-muted-foreground">{opt.hint}</span>
          </span>
          <ToggleSwitch
            checked={delivery[opt.key]}
            onChange={() => setDelivery((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))}
          />
        </div>
      ))}
    </div>
  );

  const listingTypeField = (
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
  );

  const basicFields = (
    <>
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
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Estoque</label>
          <input
            required
            type="number"
            min={0}
            placeholder="Estoque"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
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
    </>
  );

  const previewCard = (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/30">
      <div className="flex h-64 w-full items-center justify-center bg-black lg:h-96">
        {cover ? (
          cover.type === "video" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={cover.previewUrl} className="h-full w-full object-contain" muted controls />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.previewUrl} alt="" className="h-full w-full object-contain" />
          )
        ) : (
          <span className="text-6xl">📦</span>
        )}
      </div>

      <div className="p-5">
        <h2 className="text-xl font-semibold text-foreground">{title || "Título do anúncio"}</h2>
        <p className="mt-1 text-2xl font-bold text-brand">
          {priceCentsPreview !== null ? formatPriceCents(priceCentsPreview) : "R$ 0,00"}
          <span className="text-sm font-normal text-muted-foreground">
            {PRICE_DISPLAY_SUFFIX[listingType]}
          </span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {categories.find((c) => c.id === categoryId)?.name}
          {categorySubcategories.find((s) => s.id === subcategoryId) &&
            ` › ${categorySubcategories.find((s) => s.id === subcategoryId)!.name}`}
        </p>
        {listingType === "produto" && (
          <p className="mt-1 text-sm text-muted-foreground">
            Condição: {PRODUCT_CONDITION_LABEL[condition]} · {PACKAGE_SIZE_LABEL[packageSize]}
          </p>
        )}
        {listingType !== "produto" && contactPhone && (
          <p className="mt-1 text-sm text-muted-foreground">📞 {contactPhone}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">📍 {addressLabel}</p>

        <div className="my-4 h-px bg-border" />

        <h3 className="mb-1 font-semibold text-foreground">Descrição</h3>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {description || "Nenhuma descrição fornecida."}
        </p>

        {listingType === "produto" && (
          <>
            <div className="my-4 h-px bg-border" />

            <h3 className="mb-1 font-semibold text-foreground">Opções de entrega</h3>
            {activeDeliveryOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma opção selecionada.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {activeDeliveryOptions.map((opt) => (
                  <p key={opt.key} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: wizard de 2 passos */}
      <div className="mx-auto max-w-md lg:hidden">
        {step === 1 ? (
          <>
            <h1 className="mb-6 text-xl font-semibold">Postar produto</h1>
            <form onSubmit={handleAdvance} className="flex flex-col gap-3">
              {listingTypeField}
              {basicFields}
              {addressField}
              {mediaPickerField}
              {mediaGrid}
              {categoryField}
              {listingType === "produto" && conditionField}
              {listingType === "produto" && packageSizeField}
              {listingType === "produto" && deliveryField}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-glow"
              >
                Avançar
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                aria-label="Voltar"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground"
              >
                ←
              </button>
              <h1 className="text-xl font-semibold">Pré-visualização</h1>
            </div>
            {previewCard}
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            {uploadStatus && <p className="mt-4 text-sm text-muted-foreground">{uploadStatus}</p>}
            <button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-brand to-primary py-4 font-bold text-primary-foreground shadow-glow disabled:opacity-50"
            >
              {loading ? "Publicando..." : "Confirmar e Publicar"}
            </button>
          </>
        )}
      </div>

      {/* Desktop: formulário + prévia ao vivo lado a lado */}
      <div className="hidden w-full gap-8 lg:flex">
        <aside className="flex w-[420px] shrink-0 flex-col gap-3 rounded-2xl border border-border bg-card/30 p-6 xl:w-[460px]">
          <h1 className="mb-1 text-lg font-semibold">Novo Anúncio</h1>
          {listingTypeField}
          {basicFields}
          {addressField}
          {mediaPickerField}
          {mediaGrid}
          {categoryField}
          {listingType === "produto" && conditionField}
          {listingType === "produto" && packageSizeField}
          {listingType === "produto" && deliveryField}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {uploadStatus && <p className="text-sm text-muted-foreground">{uploadStatus}</p>}
          <button
            type="button"
            onClick={handlePublish}
            disabled={loading}
            className="mt-2 rounded-xl bg-gradient-to-r from-brand to-primary py-3 font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {loading ? "Publicando..." : "Publicar"}
          </button>
        </aside>

        <main className="min-w-0 flex-1">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Pré-visualização do anúncio
          </h2>
          {previewCard}
        </main>
      </div>

      {editingIndex !== null && media[editingIndex] && (
        <PhotoEditorModal
          imageUrl={media[editingIndex]!.previewUrl}
          isCover={editingIndex === 0}
          onCancel={() => setEditingIndex(null)}
          onSave={(file) => handleEditedMedia(editingIndex, file)}
          onSetCover={() => setCover(editingIndex)}
          onRemove={() => removeMedia(editingIndex)}
        />
      )}
    </>
  );
}
