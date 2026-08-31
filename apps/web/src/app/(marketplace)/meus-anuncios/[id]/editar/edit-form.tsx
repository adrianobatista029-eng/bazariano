"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@marketplace/supabase";
import type { ProductCondition, PackageSize, ListingType } from "@marketplace/supabase/queries";
import { updateProduct } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_CONDITION_LABEL } from "@/lib/product-condition";
import { PACKAGE_SIZE_LABEL } from "@/lib/package-size";
import { PRICE_LABEL } from "@/lib/listing-type";
import { DELIVERY_OPTIONS } from "@/lib/delivery-options";
import { formatPriceCents } from "@/lib/format";
import { PriceInput } from "@/lib/price-input";

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
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
};

// Depois de publicado, o anúncio não pode mais ser alterado — só o preço, e
// só pra baixo (nunca pra cima). Editar tudo de novo poderia enganar quem já
// viu o anúncio antes; baixar o preço não tem esse problema.
export function EditListingForm({ product }: { product: Product }) {
  const router = useRouter();
  const listingType = product.listing_type ?? "produto";
  const originalPriceCents = product.price_cents;
  const [priceCents, setPriceCents] = useState(originalPriceCents);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cover = product.product_media[0];

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

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await updateProduct(supabase, product.id, {
      price_cents: priceCents,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/meus-anuncios");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
        Depois de publicado, o anúncio não pode mais ser editado — só o preço, e só pra baixo. Pra
        mudar qualquer outra coisa, remova este anúncio e publique um novo.
      </p>

      <div className="flex gap-3 rounded-xl border border-border p-3">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {cover ? (
            cover.type === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={cover.url} className="h-full w-full object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.url} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <span className="text-2xl">📦</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{product.title}</p>
          {product.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {listingType === "produto" && (
              <>
                <span>Estoque: {product.stock}</span>
                {product.condition && <span>{PRODUCT_CONDITION_LABEL[product.condition]}</span>}
                {product.package_size && <span>{PACKAGE_SIZE_LABEL[product.package_size]}</span>}
              </>
            )}
            {listingType !== "produto" && product.contact_phone && (
              <span>📞 {product.contact_phone}</span>
            )}
          </div>
          {(product.street || product.city) && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              📍 {product.street}
              {product.number ? `, ${product.number}` : ""}
              {product.neighborhood ? ` - ${product.neighborhood}` : ""}
              {product.city ? `, ${product.city}/${product.state}` : ""}
            </p>
          )}
        </div>
      </div>

      {listingType === "produto" && (
        <div className="flex flex-wrap gap-1.5">
          {DELIVERY_OPTIONS.filter((opt) =>
            opt.key === "allow_seller_delivery"
              ? product.allow_seller_delivery === true
              : product[opt.key] !== false
          ).map((opt) => (
            <span
              key={opt.key}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground"
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </span>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            {PRICE_LABEL[listingType]}
          </label>
          <p className="mb-2 text-xs text-muted-foreground">
            Preço atual: {formatPriceCents(originalPriceCents)}
          </p>
          <PriceInput
            required
            cents={priceCents}
            onChange={setPriceCents}
            className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar novo preço"}
        </button>
      </form>
    </div>
  );
}
