package com.mobileentregador

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class OverlayModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "OverlayModule"

  @ReactMethod
  fun hasOverlayPermission(promise: Promise) {
    val granted =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          Settings.canDrawOverlays(reactApplicationContext)
        } else {
          true
        }
    promise.resolve(granted)
  }

  @ReactMethod
  fun requestOverlayPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val intent =
          Intent(
              Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
              Uri.parse("package:" + reactApplicationContext.packageName))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(intent)
    }
  }

  @ReactMethod
  fun showBubble() {
    val intent = Intent(reactApplicationContext, OverlayService::class.java)
    intent.action = OverlayService.ACTION_SHOW
    reactApplicationContext.startService(intent)
  }

  @ReactMethod
  fun hideBubble() {
    val intent = Intent(reactApplicationContext, OverlayService::class.java)
    intent.action = OverlayService.ACTION_HIDE
    reactApplicationContext.startService(intent)
  }

  @ReactMethod
  fun resetBubbleDismissal() {
    val intent = Intent(reactApplicationContext, OverlayService::class.java)
    intent.action = OverlayService.ACTION_RESET
    reactApplicationContext.startService(intent)
  }

  @ReactMethod
  fun startBubbleAlert() {
    val intent = Intent(reactApplicationContext, OverlayService::class.java)
    intent.action = OverlayService.ACTION_ALERT_ON
    reactApplicationContext.startService(intent)
  }

  @ReactMethod
  fun stopBubbleAlert() {
    val intent = Intent(reactApplicationContext, OverlayService::class.java)
    intent.action = OverlayService.ACTION_ALERT_OFF
    reactApplicationContext.startService(intent)
  }

  // Sem isso, o Android (principalmente em aparelhos Motorola/Xiaomi/Samsung
  // com gerenciador de bateria agressivo) pode congelar o app em segundo
  // plano mesmo com o serviço em primeiro plano rodando, cortando o
  // rastreamento no meio de uma entrega.
  @ReactMethod
  fun isIgnoringBatteryOptimizations(promise: Promise) {
    val powerManager =
        reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
    val ignoring = powerManager.isIgnoringBatteryOptimizations(reactApplicationContext.packageName)
    promise.resolve(ignoring)
  }

  @ReactMethod
  fun requestIgnoreBatteryOptimizations() {
    val intent =
        Intent(
            Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
            Uri.parse("package:" + reactApplicationContext.packageName))
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactApplicationContext.startActivity(intent)
  }

  // Guarda se o entregador estava online, pra o BootReceiver saber se deve
  // retomar o rastreamento sozinho depois que o celular reinicia (sem isso
  // precisaria esperar o usuário abrir o app de novo manualmente).
  @ReactMethod
  fun setCourierOnlineFlag(online: Boolean) {
    val prefs = reactApplicationContext.getSharedPreferences("courier_prefs", Context.MODE_PRIVATE)
    prefs.edit().putBoolean("courier_online", online).apply()
  }
}
