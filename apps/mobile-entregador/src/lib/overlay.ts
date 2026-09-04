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

// Mesmo pedido em qualquer lugar que precise da permissão de bolha —
// entrada de usuário novo (cadastro), entrada de usuário já existente (Home)
// e a hora de ficar online. Só age se ainda não tiver sido concedida.
//
// Nada de Alert.alert aqui de propósito: nesse app (New Architecture /
// Bridgeless) ele falha silenciosamente quando chamado logo cedo — sem
// nenhum erro no JS, o diálogo simplesmente nunca aparece. Vai direto pra
// tela de configuração do Android, que é 100% nativa e não depende disso.
export function promptOverlayPermission() {
  if (Platform.OS !== "android") return;
  hasOverlayPermission().then((granted) => {
    if (granted) return;
    requestOverlayPermission();
  });
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

// Faz as setas da bolha girarem (mesmo efeito do splash de abertura) —
// chamado quando chega uma oferta de entrega nova com o app em segundo
// plano. Ver src/lib/order-alerts.ts.
export function startBubbleAlert() {
  if (Platform.OS !== "android") return;
  OverlayModule.startBubbleAlert();
}

export function stopBubbleAlert() {
  if (Platform.OS !== "android") return;
  OverlayModule.stopBubbleAlert();
}

// Grava se o entregador está online, pra o BootReceiver nativo saber se
// deve retomar o rastreamento sozinho quando o celular reiniciar — ver
// src/lib/boot-task.ts.
export function setCourierOnlineFlag(online: boolean) {
  if (Platform.OS !== "android") return;
  OverlayModule.setCourierOnlineFlag(online);
}
