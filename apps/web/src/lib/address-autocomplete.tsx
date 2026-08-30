"use client";

import { useEffect, useRef, useState } from "react";

export type StructuredAddress = {
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  lat: number;
  lng: number;
};

type MapboxFeature = {
  place_name: string;
  center: [number, number];
  text: string;
  address?: string;
  context?: { id: string; text: string; short_code?: string }[];
};

function parseFeature(feature: MapboxFeature): StructuredAddress {
  const context = feature.context ?? [];
  const find = (prefix: string) => context.find((c) => c.id.startsWith(prefix));

  const neighborhood = find("neighborhood")?.text ?? find("locality")?.text ?? null;
  const city = find("place")?.text ?? null;
  const regionShortCode = find("region")?.short_code;
  const state = regionShortCode ? regionShortCode.split("-").pop()!.toUpperCase() : null;

  return {
    street: feature.text ?? null,
    number: feature.address ?? null,
    neighborhood,
    city,
    state,
    lat: feature.center[1],
    lng: feature.center[0],
  };
}

// Geocodifica um endereço completo (rua + número) pra pegar a coordenada
// exata daquele ponto — usado depois que o usuário confirma/edita o número
// manualmente, já que a sugestão original do autocomplete pode não ter
// interpolado o número certo.
export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json?access_token=${token}&country=BR&types=address&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    const feature: MapboxFeature | undefined = data.features?.[0];
    if (!feature) return null;
    return { lat: feature.center[1], lng: feature.center[0] };
  } catch {
    return null;
  }
}

export function AddressAutocomplete({
  onSelect,
  placeholder = "Digite seu endereço...",
}: {
  onSelect: (address: StructuredAddress, label: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ label: string; feature: MapboxFeature }[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextSearchRef = useRef(false);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${token}&country=BR&types=address&autocomplete=true&language=pt&limit=5`;
        const res = await fetch(url);
        const data = await res.json();
        const features: MapboxFeature[] = data.features ?? [];
        setResults(features.map((f) => ({ label: f.place_name, feature: f })));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleSelect(item: { label: string; feature: MapboxFeature }) {
    onSelect(parseFeature(item.feature), item.label);
    skipNextSearchRef.current = true;
    setQuery(item.label);
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          ...
        </span>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-elevated">
          {results.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
