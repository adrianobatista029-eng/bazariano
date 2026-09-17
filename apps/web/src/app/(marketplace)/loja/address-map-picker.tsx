"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Mapa com um pin arrastável — o autocomplete já traz uma coordenada boa,
// mas o usuário pode arrastar o pin pra ajustar o ponto exato (entrada da
// loja, por exemplo), igual apps de entrega fazem na hora de confirmar
// o endereço.
export function AddressMapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [lng, lat],
      zoom: 16,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    const marker = new mapboxgl.Marker({ color: "#f97316", draggable: true })
      .setLngLat([lng, lat])
      .addTo(map);
    marker.on("dragend", () => {
      const pos = marker.getLngLat();
      onChangeRef.current({ lat: pos.lat, lng: pos.lng });
    });
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Só na montagem — a coordenada inicial é só o ponto de partida, updates
    // depois disso vêm do efeito abaixo (endereço novo) ou do próprio drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recentraliza o mapa e reposiciona o pin quando a coordenada muda por
  // fora (usuário escolheu um endereço diferente no autocomplete) — sem
  // isso o pin ficava preso na posição antiga.
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLngLat([lng, lat]);
    mapRef.current.flyTo({ center: [lng, lat], zoom: 16 });
  }, [lat, lng]);

  return (
    <div>
      <div ref={containerRef} className="h-64 w-full rounded-lg border border-border" />
      <p className="mt-1.5 text-xs text-muted-foreground">
        Arraste o marcador pra ajustar o ponto exato da loja no mapa.
      </p>
    </div>
  );
}
