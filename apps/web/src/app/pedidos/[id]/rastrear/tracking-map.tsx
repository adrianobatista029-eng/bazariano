"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getCourierLocation, subscribeToCourierLocation } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type Point = { lat: number; lng: number };

export function TrackingMap({
  courierId,
  destination,
}: {
  courierId: string;
  destination: Point | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const courierMarkerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
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

    getCourierLocation(supabase, courierId).then(({ data }) => {
      if (data) moveCourierMarker(data.lat, data.lng);
    });

    const channel = subscribeToCourierLocation(supabase, courierId, (location) => {
      moveCourierMarker(location.lat, location.lng);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courierId]);

  return <div ref={containerRef} className="h-96 w-full rounded-lg border border-slate-200" />;
}
