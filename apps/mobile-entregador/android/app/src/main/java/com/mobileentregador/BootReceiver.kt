package com.mobileentregador

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Só reage se o entregador estava online quando o celular desligou (ver
// OverlayModule.setCourierOnlineFlag, chamado de src/lib/location.ts) — sem
// essa checagem, todo reinício do aparelho tentaria começar a rastrear
// mesmo pra quem nunca ficou online.
//
// Sobe como serviço comum (não foreground) de propósito: a própria tarefa
// headless, ao rodar, chama startLocationTracking() que promove o processo
// a foreground de verdade via notifee — se pedíssemos foreground aqui, o
// Android exige startForeground() em até 5s ou derruba o serviço, e quem
// cuida disso é o notifee, não esse Service.
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return

    val prefs = context.getSharedPreferences("courier_prefs", Context.MODE_PRIVATE)
    val wasOnline = prefs.getBoolean("courier_online", false)
    if (!wasOnline) return

    context.startService(Intent(context, LocationBootTaskService::class.java))
  }
}
