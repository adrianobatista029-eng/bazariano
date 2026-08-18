import { AppState, PermissionsAndroid, Platform } from "react-native";
import type { AppStateStatus, NativeEventSubscription } from "react-native";
import Geolocation from "react-native-geolocation-service";
import notifee, { AndroidImportance, AndroidVisibility } from "@notifee/react-native";
import { upsertCourierLocation } from "@marketplace/supabase";
import { supabase } from "./supabase";
import {
  hideDeliveryBubble,
  resetDeliveryBubbleDismissal,
  showDeliveryBubble,
} from "./overlay";

let watchId: number | null = null;
let appStateSubscription: NativeEventSubscription | null = null;

// A bolha acompanha o status online, não uma entrega específica: some quando
// o app volta pro primeiro plano, aparece de novo quando sai — igual
// iFood/Uber. Só é desligada de vez quando o usuário toca no X (ver
// OverlayService), até o entregador ficar online outra vez.
function watchAppStateForBubble() {
  if (appStateSubscription) return;
  resetDeliveryBubbleDismissal();
  appStateSubscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
    if (nextState === "background") {
      showDeliveryBubble();
    } else if (nextState === "active") {
      hideDeliveryBubble();
    }
  });
}

function unwatchAppStateForBubble() {
  appStateSubscription?.remove();
  appStateSubscription = null;
  hideDeliveryBubble();
}

const TRACKING_CHANNEL_ID = "courier-tracking";
const TRACKING_NOTIFICATION_ID = "courier-tracking";

// Mantém o app "vivo" em segundo plano enquanto o entregador está online.
// Sem um foreground service, o Android mata o processo poucos segundos depois
// de sair do app, fazendo com que ele reinicie do zero ao reabrir e
// interrompendo o envio de localização. A notificação persistente é o preço
// (visível, exigido pelo Android) para o app continuar rodando de verdade.
async function startForegroundTracking() {
  if (Platform.OS !== "android") return;

  await notifee.requestPermission();
  await notifee.createChannel({
    id: TRACKING_CHANNEL_ID,
    name: "Rastreamento de entrega",
    importance: AndroidImportance.LOW,
    visibility: AndroidVisibility.PUBLIC,
  });

  await notifee.displayNotification({
    id: TRACKING_NOTIFICATION_ID,
    title: "Você está online",
    body: "Rastreando sua localização para receber pedidos",
    android: {
      channelId: TRACKING_CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      smallIcon: "ic_launcher",
      importance: AndroidImportance.LOW,
      pressAction: { id: "default" },
    },
  });
}

async function stopForegroundTracking() {
  if (Platform.OS !== "android") return;
  await notifee.stopForegroundService();
  await notifee.cancelNotification(TRACKING_NOTIFICATION_ID);
}

type LocationListener = (latitude: number, longitude: number) => void;
const listeners = new Set<LocationListener>();

// Permite que a UI (ex.: o mapa da Home) reaja à mesma posição de GPS que
// está sendo gravada no Supabase, em vez de depender do motor de localização
// nativo do Mapbox (que no emulador não reage ao comando "geo fix").
export function subscribeToDeviceLocation(listener: LocationListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

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
// Chamado enquanto o entregador estiver "online" (ver toggle na Home),
// continua rodando durante entregas ativas também.
export function startLocationTracking(courierId: string) {
  if (watchId !== null) return;

  startForegroundTracking().catch((error) =>
    console.warn("Falha ao iniciar serviço em primeiro plano", error)
  );
  watchAppStateForBubble();

  watchId = Geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      listeners.forEach((listener) => listener(latitude, longitude));
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
  stopForegroundTracking().catch((error) =>
    console.warn("Falha ao parar serviço em primeiro plano", error)
  );
  unwatchAppStateForBubble();
}
