import { NativeModules, Platform } from "react-native";

const { OverlayModule } = NativeModules;

export async function hasOverlayPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  return OverlayModule.hasOverlayPermission();
}

export function requestOverlayPermission() {
  if (Platform.OS !== "android") return;
  OverlayModule.requestOverlayPermission();
}

export function showDeliveryBubble() {
  if (Platform.OS !== "android") return;
  OverlayModule.showBubble();
}

export function hideDeliveryBubble() {
  if (Platform.OS !== "android") return;
  OverlayModule.hideBubble();
}

// Chamado sempre que o entregador fica online: reabre a "porta" pra bolha
// voltar a aparecer, mesmo que o usuário tenha descartado ela (X) numa
// sessão online anterior.
export function resetDeliveryBubbleDismissal() {
  if (Platform.OS !== "android") return;
  OverlayModule.resetBubbleDismissal();
}
