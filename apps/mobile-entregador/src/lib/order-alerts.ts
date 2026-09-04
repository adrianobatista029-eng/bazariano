import { AppState } from "react-native";
import type { AppStateStatus, NativeEventSubscription } from "react-native";
import { subscribeToAvailableOrders } from "@marketplace/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { startBubbleAlert, stopBubbleAlert } from "./overlay";

let channel: RealtimeChannel | null = null;
let appStateSubscription: NativeEventSubscription | null = null;
let isBackground = false;

// Enquanto o entregador está online, ouve pedidos novos em tempo real (sem
// polling) e faz as setas da bolha girarem se o app estiver em segundo
// plano nesse momento — é isso que avisa "tem oferta esperando" sem
// precisar abrir o app, igual iFood/Uber. Some sozinho quando volta pro
// app (ver watchAppStateForBubble em location.ts, que já esconde a bolha
// inteira nesse momento).
export function startOrderAlerts() {
  if (channel) return;

  isBackground = AppState.currentState !== "active";
  appStateSubscription = AppState.addEventListener("change", (next: AppStateStatus) => {
    isBackground = next !== "active";
    if (!isBackground) stopBubbleAlert();
  });

  channel = subscribeToAvailableOrders(supabase, () => {
    if (isBackground) startBubbleAlert();
  });
}

export function stopOrderAlerts() {
  channel?.unsubscribe();
  channel = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
  stopBubbleAlert();
}
