"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { subscribeToOrderLocation } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type Point = { lat: number; lng: number };

export function TrackingMap({
  orderId,
  initialCourierLocation,
  destination,
}: {
  orderId: string;
  initialCourierLocation: Point | null;
  destination: Point | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const courierMarkerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: destination ? [destination.lng, destination.lat] : [-46.6333, -23.5505],
      zoom: 13,
    });
    mapRef.current = map;

    if (destination) {
      new mapboxgl.Marker({ color: "#0f7dfa" })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map);
    }

    courierMarkerRef.current = new mapboxgl.Marker({ color: "#16a34a" });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [destination]);

  useEffect(() => {
    const supabase = createClient();

    function moveCourierMarker(lat: number, lng: number) {
      if (!mapRef.current || !courierMarkerRef.current) return;
      courierMarkerRef.current.setLngLat([lng, lat]).addTo(mapRef.current);
      mapRef.current.panTo([lng, lat]);
    }

    if (initialCourierLocation) {
      moveCourierMarker(initialCourierLocation.lat, initialCourierLocation.lng);
    }

    const channel = subscribeToOrderLocation(supabase, orderId, (location) => {
      moveCourierMarker(location.lat, location.lng);
    });

    return () => {
      supabase.removeChannel(channel);
    };
    // initialCourierLocation é só a posição de largada (antes do primeiro
    // evento em tempo real) — de propósito fora das deps. Um objeto novo
    // chega a cada atualização de orders (a página inteira agora é
    // reativa), e incluir isso aqui cancelava/recriava a assinatura do
    // Realtime a cada localização nova, quebrando o tempo real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return <div ref={containerRef} className="h-96 w-full rounded-lg border border-border" />;
}
