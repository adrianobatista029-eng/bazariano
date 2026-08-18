import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type Client = SupabaseClient<Database>;

export function upsertCourierLocation(
  client: Client,
  courierId: string,
  lat: number,
  lng: number
) {
  return client
    .from("courier_locations")
    .upsert({ courier_id: courierId, lat, lng })
    .select()
    .single();
}

export function getCourierLocation(client: Client, courierId: string) {
  return client.from("courier_locations").select("*").eq("courier_id", courierId).single();
}

// Assina updates em tempo real da localização de um entregador específico.
// Uso: const channel = subscribeToCourierLocation(client, courierId, (loc) => ...)
export function subscribeToCourierLocation(
  client: Client,
  courierId: string,
  onUpdate: (location: Database["public"]["Tables"]["courier_locations"]["Row"]) => void
) {
  return client
    .channel(`courier-location-${courierId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "courier_locations",
        filter: `courier_id=eq.${courierId}`,
      },
      (payload) => {
        onUpdate(payload.new as Database["public"]["Tables"]["courier_locations"]["Row"]);
      }
    )
    .subscribe();
}

export function setCourierStatus(
  client: Client,
  courierId: string,
  status: Database["public"]["Tables"]["couriers"]["Row"]["status"]
) {
  return client.from("couriers").update({ status }).eq("id", courierId).select().single();
}

export function createCourierProfile(
  client: Client,
  courierId: string,
  vehicleType: string,
  vehiclePlate: string
) {
  return client
    .from("couriers")
    .insert({ id: courierId, vehicle_type: vehicleType, vehicle_plate: vehiclePlate })
    .select()
    .single();
}
