"use client";

import { useEffect, useState } from "react";
import type { Database } from "@marketplace/supabase";
import { ProductCard } from "./product-card";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  product_media: Database["public"]["Tables"]["product_media"]["Row"][];
  lat?: number | null;
  lng?: number | null;
};

// Distância em km entre duas coordenadas (fórmula de Haversine).
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function NearbyProductGrid({
  products,
  currentUserId,
}: {
  products: Product[];
  currentUserId?: string | null;
}) {
  const [sorted, setSorted] = useState<Product[]>(products);
  const [sortedByLocation, setSortedByLocation] = useState(false);

  useEffect(() => {
    setSorted(products);
    setSortedByLocation(false);

    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const withDistance = products.map((p) => ({
          product: p,
          distance:
            typeof p.lat === "number" && typeof p.lng === "number"
              ? distanceKm(latitude, longitude, p.lat, p.lng)
              : null,
        }));
        withDistance.sort((a, b) => {
          if (a.distance === null && b.distance === null) return 0;
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
        setSorted(withDistance.map((w) => w.product));
        setSortedByLocation(true);
      },
      () => {
        // Sem permissão/erro — mantém a ordem original (mais recentes primeiro).
      },
      { timeout: 5000 }
    );
  }, [products]);

  return (
    <div className="flex flex-col gap-3">
      {sortedByLocation && (
        <p className="text-sm text-muted-foreground">📍 Mostrando os mais próximos de você primeiro</p>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {sorted.map((product) => (
          <ProductCard key={product.id} product={product} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  );
}
