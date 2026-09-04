import { NativeModules, Platform } from "react-native";

const { OverlayModule } = NativeModules;

export async function isIgnoringBatteryOptimizations(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  return OverlayModule.isIgnoringBatteryOptimizations();
}

export function requestIgnoreBatteryOptimizations() {
  if (Platform.OS !== "android") return;
  OverlayModule.requestIgnoreBatteryOptimizations();
}

// Sem isso, o Android pode "congelar" o app em segundo plano em vários
// aparelhos (principalmente Motorola/Xiaomi/Samsung) mesmo com o serviço em
// primeiro plano rodando, cortando o rastreamento no meio de uma entrega.
// Mesmo padrão do promptOverlayPermission: vai direto pra tela de
// configuração, sem diálogo explicativo antes (Alert.alert falha cedo
// demais nesse app — ver overlay.ts).
export function promptBatteryOptimizationExemption() {
  if (Platform.OS !== "android") return;
  isIgnoringBatteryOptimizations().then((ignoring) => {
    if (ignoring) return;
    requestIgnoreBatteryOptimizations();
  });
}
