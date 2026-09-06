"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createProduct,
  createProductMedia,
  updateProduct,
  uploadProductMedia,
  productMediaStoragePath,
} from "@marketplace/supabase/queries";
import type { Database } from "@marketplace/supabase";
import { formatPriceCents } from "@/lib/format";
import { PriceInput } from "@/lib/price-input";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  product_media: Database["public"]["Tables"]["product_media"]["Row"][];
};

// Produto criado por aqui já nasce dentro desta loja (store_id) — não
// existe conceito de "anúncio" nessa tela, é tudo vitrine da própria loja.
// Os campos que o marketplace geral exige (condition, entrega, etc.) usam
// os defaults do banco, que já satisfazem as regras sozinhos.
export function StoreProducts({
  ownerId,
  storeId,
  products,
}: {
  ownerId: string;
  storeId: string;
  products: Product[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleMove(product: Product, direction: "up" | "down") {
    const sorted = [...products].sort((a, b) => a.position - b.position);
    const index = sorted.findIndex((p) => p.id === product.id);
    const swapWith = direction === "up" ? sorted[index - 1] : sorted[index + 1];
    if (!swapWith) return;

    setBusyId(product.id);
    const supabase = createClient();
    await Promise.all([
      updateProduct(supabase, product.id, { position: swapWith.position }),
      updateProduct(supabase, swapWith.id, { position: product.position }),
    ]);
    setBusyId(null);
    router.refresh();
  }

  async function handleRemove(productId: string) {
    setBusyId(productId);
    const supabase = createClient();
    await updateProduct(supabase, productId, { store_id: null });
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-foreground">Produtos da loja</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products
          .sort((a, b) => a.position - b.position)
          .map((product, index) =>
            editingId === product.id ? (
              <EditPriceCard
                key={product.id}
                product={product}
                onDone={() => {
                  setEditingId(null);
                  router.refresh();
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={product.id}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-card/30 p-3 shadow-lg"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                  {product.product_media[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.product_media[0].url}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-3xl">📦</span>
                  )}
                </div>
                <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{product.title}</h3>
                <p className="text-sm text-brand">{formatPriceCents(product.price_cents)}</p>
                <div className="mt-auto flex items-center gap-2">
                  <button
                    onClick={() => handleMove(product, "up")}
                    disabled={index === 0 || busyId === product.id}
                    className="rounded-lg bg-secondary px-2 py-1.5 text-sm disabled:opacity-30"
                    aria-label="Mover para cima"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMove(product, "down")}
                    disabled={index === products.length - 1 || busyId === product.id}
                    className="rounded-lg bg-secondary px-2 py-1.5 text-sm disabled:opacity-30"
                    aria-label="Mover para baixo"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => setEditingId(product.id)}
                    className="rounded-lg bg-secondary px-2 py-1.5 text-xs font-medium text-foreground"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleRemove(product.id)}
                    disabled={busyId === product.id}
                    className="ml-auto rounded-lg bg-destructive/10 px-2 py-1.5 text-xs font-medium text-destructive disabled:opacity-50"
                  >
                    Remover
                  </button>
                </div>
              </div>
            )
          )}

        <AddProductCard
          ownerId={ownerId}
          storeId={storeId}
          nextPosition={products.length}
          adding={adding}
          setAdding={setAdding}
        />
      </div>
    </div>
  );
}

// Mesma regra de "meus anúncios": depois de criado, o produto não pode
// mais ser editado — só o preço, e só pra baixo (nunca pra cima), pra não
// enganar quem já viu o preço anunciado antes.
function EditPriceCard({
  product,
  onDone,
  onCancel,
}: {
  product: Product;
  onDone: () => void;
  onCancel: () => void;
}) {
  const originalPriceCents = product.price_cents;
  const [priceCents, setPriceCents] = useState(originalPriceCents);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!priceCents || priceCents <= 0) {
      setError("Informe um preço válido.");
      return;
    }
    if (priceCents > originalPriceCents) {
      setError("Você só pode baixar o preço, nunca aumentar.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await updateProduct(supabase, product.id, { price_cents: priceCents });
    setSaving(false);

    if (updateError) {
      setError("Não foi possível salvar agora.");
      return;
    }

    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-card/30 p-3 shadow-lg"
    >
      <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{product.title}</h3>
      <p className="text-xs text-muted-foreground">
        Preço atual: {formatPriceCents(originalPriceCents)}
      </p>
      <PriceInput
        required
        cents={priceCents}
        onChange={setPriceCents}
        className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="mt-auto flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function AddProductCard({
  ownerId,
  storeId,
  nextPosition,
  adding,
  setAdding,
}: {
  ownerId: string;
  storeId: string;
  nextPosition: number;
  adding: boolean;
  setAdding: (v: boolean) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceCents, setPriceCents] = useState(0);
  const [stock, setStock] = useState("1");
  const [files, setFiles] = useState<File[]>([]);
  const [detailFiles, setDetailFiles] = useState<File[]>([]);
  const [specs, setSpecs] = useState<{ label: string; value: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateSpec(index: number, field: "label" | "value", value: string) {
    setSpecs((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function removeSpec(index: number) {
    setSpecs((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !priceCents || priceCents <= 0) {
      setError("Preencha nome e preço válidos.");
      return;
    }
    if (files.length === 0) {
      setError("Adicione pelo menos uma foto.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const cleanSpecs = specs.filter((s) => s.label.trim() && s.value.trim());

    const { data: product, error: createError } = await createProduct(supabase, {
      seller_id: ownerId,
      title: title.trim(),
      description: description.trim() || null,
      price_cents: priceCents,
      stock: parseInt(stock, 10) || 1,
      store_id: storeId,
      position: nextPosition,
      specs: cleanSpecs,
    });

    if (createError || !product) {
      setSaving(false);
      setError("Não foi possível criar o produto agora.");
      return;
    }

    const mediaRows = [];
    for (const [i, file] of files.entries()) {
      const path = productMediaStoragePath(ownerId, product.id, file.name, i);
      const { url, error: uploadError } = await uploadProductMedia(supabase, path, file);
      if (uploadError || !url) continue;
      mediaRows.push({ product_id: product.id, url, type: "photo" as const, position: i, section: "gallery" as const });
    }
    for (const [i, file] of detailFiles.entries()) {
      const path = productMediaStoragePath(ownerId, product.id, file.name, files.length + i);
      const { url, error: uploadError } = await uploadProductMedia(supabase, path, file);
      if (uploadError || !url) continue;
      mediaRows.push({ product_id: product.id, url, type: "photo" as const, position: i, section: "details" as const });
    }
    if (mediaRows.length > 0) {
      await createProductMedia(supabase, mediaRows);
    }

    setSaving(false);
    setAdding(false);
    setTitle("");
    setDescription("");
    setPriceCents(0);
    setStock("1");
    setFiles([]);
    setDetailFiles([]);
    setSpecs([]);
    router.refresh();
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-brand hover:text-brand"
      >
        <span className="text-3xl">+</span>
        <span className="text-sm font-medium">Adicionar produto</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="col-span-2 flex flex-col gap-3 rounded-2xl border border-border bg-card/30 p-4 shadow-lg sm:col-span-3 lg:col-span-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nome do produto"
          className="rounded-lg border border-border bg-secondary px-4 py-2 text-foreground"
        />
        <PriceInput
          required
          cents={priceCents}
          onChange={setPriceCents}
          placeholder="Preço (ex: 49,90)"
          className="rounded-lg border border-border bg-secondary px-4 py-2 text-foreground"
        />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição (opcional)"
        rows={2}
        className="rounded-lg border border-border bg-secondary px-4 py-2 text-foreground"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="Estoque"
          inputMode="numeric"
          className="rounded-lg border border-border bg-secondary px-4 py-2 text-foreground"
        />
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Fotos principais</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="text-sm text-muted-foreground"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Mais fotos (detalhes, mostradas embaixo na página do produto)
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setDetailFiles(Array.from(e.target.files ?? []))}
          className="text-sm text-muted-foreground"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs text-muted-foreground">Especificações (opcional)</label>
          <button
            type="button"
            onClick={() => setSpecs((prev) => [...prev, { label: "", value: "" }])}
            className="text-xs font-medium text-brand"
          >
            + adicionar linha
          </button>
        </div>
        {specs.map((spec, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input
              value={spec.label}
              onChange={(e) => updateSpec(i, "label", e.target.value)}
              placeholder="Ex: Material"
              className="flex-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground"
            />
            <input
              value={spec.value}
              onChange={(e) => updateSpec(i, "value", e.target.value)}
              placeholder="Ex: Algodão"
              className="flex-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground"
            />
            <button
              type="button"
              onClick={() => removeSpec(i)}
              className="rounded-lg bg-destructive/10 px-2 text-xs text-destructive"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar produto"}
        </button>
        <button
          type="button"
          onClick={() => setAdding(false)}
          className="rounded-full bg-secondary px-5 py-2 text-sm font-medium text-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
