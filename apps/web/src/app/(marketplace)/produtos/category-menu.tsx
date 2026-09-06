"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, Subcategory } from "@marketplace/supabase/queries";
import { listCategoriesWithSubcategories } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { LISTING_TYPES, categoryDomain } from "@/lib/listing-type";

// Botão de categorias no cabeçalho, ao lado do toggle de tema — abre uma
// lista organizada por tipo de anúncio (produto, serviço, aluguel, venda de
// imóvel), cada um só com as categorias do seu próprio domínio. Clicar numa
// categoria expande as subcategorias dela logo abaixo (só uma expandida por
// vez); clicar numa subcategoria filtra por ela.
export function CategoryMenu({ variant = "icon" }: { variant?: "icon" | "text" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    listCategoriesWithSubcategories(supabase).then(({ categories: cats, subcategories: subs }) => {
      setCategories(cats);
      setSubcategories(subs);
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

  function toggleCategory(categoryId: string) {
    setExpandedCategoryId((current) => (current === categoryId ? null : categoryId));
  }

  function selectSubcategory(categoryId: string, subcategoryId: string) {
    setOpen(false);
    router.push(`/produtos?categoria=${categoryId}&subcategoria=${subcategoryId}`);
  }

  return (
    <div ref={containerRef} className="relative">
      {variant === "text" ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 py-2.5 text-sm font-semibold transition-colors ${
            open ? "border-brand text-brand" : "border-transparent text-foreground hover:text-brand"
          }`}
        >
          Categorias
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title="Categorias"
          aria-label="Categorias"
          className="flex flex-col items-center gap-0.5"
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:border-brand md:h-12 md:w-12 ${
              open ? "border-brand" : "border-border bg-secondary"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/categories-icon.png" alt="" className="icon-crisp h-5 w-5 md:h-8 md:w-8" />
          </span>
          <span className={`text-[10px] font-medium ${open ? "text-brand" : "text-muted-foreground"}`}>
            Categorias
          </span>
        </button>
      )}
      {open && (
        <div
          className={`fixed inset-x-4 top-20 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-elevated md:absolute md:inset-x-auto md:top-auto md:mt-2 md:w-80 ${
            variant === "text" ? "md:left-0" : "md:right-0"
          }`}
        >
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
                  {typeCategories.map((c) => {
                    const catSubcategories = subcategories.filter((s) => s.category_id === c.id);
                    const isExpanded = expandedCategoryId === c.id;
                    return (
                      <div key={c.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (catSubcategories.length === 0) {
                              setOpen(false);
                              router.push(`/produtos?categoria=${c.id}`);
                            } else {
                              toggleCategory(c.id);
                            }
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground hover:bg-secondary"
                        >
                          {c.name}
                          {catSubcategories.length > 0 && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`shrink-0 text-muted-foreground transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          )}
                        </button>
                        {isExpanded && catSubcategories.length > 0 && (
                          <div className="ml-2 flex flex-col gap-0.5 border-l border-border pl-3">
                            {catSubcategories.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => selectSubcategory(c.id, s.id)}
                                className="rounded-lg px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                              >
                                {s.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
