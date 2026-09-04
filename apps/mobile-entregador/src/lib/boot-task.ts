import { supabase } from "./supabase";
import { startLocationTracking } from "./location";

// Roda sem nenhuma tela aberta, disparada pelo BootReceiver nativo quando o
// celular reinicia com o entregador online (ver OverlayModule.kt e
// index.js). Confere se a sessão salva ainda é válida e, se for, chama o
// mesmo startLocationTracking() de sempre — reaproveita toda a lógica já
// existente em vez de duplicar em Kotlin.
export default async function bootTask() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: courier } = await supabase
    .from("couriers")
    .select("status")
    .eq("id", user.id)
    .single();

  if (courier?.status === "online") {
    startLocationTracking(user.id);
  }
}
