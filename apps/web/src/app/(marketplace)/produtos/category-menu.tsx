"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@marketplace/supabase/queries";
import { listCategoriesWithSubcategories } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { LISTING_TYPES, categoryDomain } from "@/lib/listing-type";

// Botão de categorias no cabeçalho, ao lado do toggle de tema — abre uma
// lista organizada por tipo de anúncio (produto, serviço, aluguel, venda de
// imóvel), cada um só com as categorias do seu próprio domínio.
export function CategoryMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    listCategoriesWithSubcategories(supabase).then(({ categories: cats }) => {
      setCategories(cats);
    });
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function selectCategory(categoryId: string) {
    setOpen(false);
    router.push(`/produtos?categoria=${categoryId}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Categorias"
        aria-label="Categorias"
        className="flex flex-col items-center gap-0.5"
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:border-brand ${
            open ? "border-brand" : "border-border bg-secondary"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/categories-icon.png" alt="" className="h-5 w-5" />
        </span>
        <span className={`text-[10px] font-medium ${open ? "text-brand" : "text-muted-foreground"}`}>
          Categorias
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-elevated">
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground">Carregando categorias...</p>
          )}
          {LISTING_TYPES.map((type) => {
            const typeCategories = categories.filter((c) => categoryDomain(c.name) === type.value);
            if (typeCategories.length === 0) return null;
            return (
              <div key={type.value} className="mb-4 last:mb-0">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {type.icon} {type.label}
                </h4>
                <div className="flex flex-col gap-0.5">
                  {typeCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCategory(c.id)}
                      className="rounded-lg px-2 py-1.5 text-left text-sm text-foreground hover:bg-secondary"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
