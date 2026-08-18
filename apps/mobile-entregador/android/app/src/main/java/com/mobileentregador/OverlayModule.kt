package com.mobileentregador

import android.content.Intent
import android.net.Uri
import android.os.Build
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
}
