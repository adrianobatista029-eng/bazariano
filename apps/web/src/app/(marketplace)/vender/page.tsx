"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";

export default function VenderPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

    const priceCents = Math.round(parseFloat(price.replace(",", ".")) * 100);

    const { data: product, error: createError } = await createProduct(supabase, {
      seller_id: user.id,
      title,
      description,
      price_cents: priceCents,
      stock: parseInt(stock, 10),
    });

    setLoading(false);

    if (createError) {
      setError(createError.message);
      return;
    }

    router.push(`/produtos/${product!.id}`);
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-xl font-semibold">Postar produto</h1>
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {loading ? "Publicando..." : "Publicar"}
        </button>
      </form>
    </div>
  );
}
