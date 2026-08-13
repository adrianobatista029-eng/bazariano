import { PermissionsAndroid, Platform } from "react-native";
import Geolocation from "react-native-geolocation-service";
import { upsertCourierLocation } from "@marketplace/supabase";
import { supabase } from "./supabase";

let watchId: number | null = null;

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: "Permissão de localização",
      message: "Precisamos da sua localização para rastrear a entrega em tempo real.",
      buttonPositive: "Permitir",
    }
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

// Envia a localização do entregador para o Supabase a cada atualização do GPS.
// Chamar após o entregador aceitar um pedido (status 'accepted' em diante).
export function startLocationTracking(courierId: string) {
  if (watchId !== null) return;

  watchId = Geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      upsertCourierLocation(supabase, courierId, latitude, longitude).then(({ error }) => {
        if (error) console.warn("Falha ao enviar localização", error);
      });
    },
    (error) => console.warn("Erro de geolocalização", error),
    {
      enableHighAccuracy: true,
      distanceFilter: 15, // metros
      interval: 5000,
      fastestInterval: 3000,
    }
  );
}

export function stopLocationTracking() {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
}
