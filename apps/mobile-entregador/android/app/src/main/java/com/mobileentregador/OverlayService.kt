package com.mobileentregador

import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.Outline
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import kotlin.math.abs

// Desenha a bolha flutuante (estilo iFood/Uber Entregador) que fica visível
// sobre outros apps sempre que o entregador está online e o app está em
// segundo plano — não só durante uma entrega. Depende da permissão especial
// "Exibir sobre outros apps" (SYSTEM_ALERT_WINDOW), concedida manualmente
// pelo usuário nas configurações do Android — ver
// OverlayModule.requestOverlayPermission().
//
// Uma vez que o usuário toca no X da bolha, ela fica "descartada" (não
// reaparece ao sair do app de novo) até o próximo ACTION_RESET, disparado
// quando o entregador fica online de novo — igual ao comportamento do
// iFood/Uber.
class OverlayService : Service() {

  private var windowManager: WindowManager? = null
  private var bubbleView: View? = null

  companion object {
    const val ACTION_SHOW = "SHOW_BUBBLE"
    const val ACTION_HIDE = "HIDE_BUBBLE"
    const val ACTION_RESET = "RESET_BUBBLE"
    private const val DRAG_THRESHOLD_PX = 12
    private var dismissed = false
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_HIDE -> removeBubble()
      ACTION_RESET -> dismissed = false
      else -> if (!dismissed) addBubble()
    }
    return START_NOT_STICKY
  }

  private fun addBubble() {
    if (bubbleView != null) return

    // Sem essa checagem, addView() lança BadTokenException e derruba o app
    // inteiro se o usuário ainda não concedeu "Exibir sobre outros apps" (ou
    // revogou depois) — nunca confiar que o lado JS já validou isso antes.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
      stopSelf()
      return
    }

    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    val density = resources.displayMetrics.density
    val size = (56 * density).toInt()
    val badgeSize = (20 * density).toInt()

    val imageView =
        ImageView(this).apply {
          setImageResource(R.drawable.overlay_bubble)
          scaleType = ImageView.ScaleType.CENTER_CROP
          clipToOutline = true
          outlineProvider =
              object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                  outline.setOval(0, 0, view.width, view.height)
                }
              }
        }

    val closeBadge =
        TextView(this).apply {
          text = "×"
          textSize = 13f
          setTextColor(Color.WHITE)
          gravity = Gravity.CENTER
          background =
              GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#EF4444"))
              }
        }

    val root = FrameLayout(this)
    root.addView(imageView, FrameLayout.LayoutParams(size, size))
    root.addView(
        closeBadge,
        FrameLayout.LayoutParams(badgeSize, badgeSize, Gravity.TOP or Gravity.END))
    bubbleView = root

    val overlayType =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
          @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
        }

    val params =
        WindowManager.LayoutParams(
            size,
            size,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT)
    params.gravity = Gravity.TOP or Gravity.START
    params.x = 0
    params.y = 300

    var initialX = 0
    var initialY = 0
    var initialTouchX = 0f
    var initialTouchY = 0f
    var isDragging = false

    root.setOnTouchListener { view, event ->
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          initialX = params.x
          initialY = params.y
          initialTouchX = event.rawX
          initialTouchY = event.rawY
          isDragging = false
          true
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = (event.rawX - initialTouchX).toInt()
          val dy = (event.rawY - initialTouchY).toInt()
          if (abs(dx) > DRAG_THRESHOLD_PX || abs(dy) > DRAG_THRESHOLD_PX) {
            isDragging = true
          }
          params.x = initialX + dx
          params.y = initialY + dy
          windowManager?.updateViewLayout(view, params)
          true
        }
        MotionEvent.ACTION_UP -> {
          if (!isDragging) {
            val tappedCloseBadge = event.x >= (view.width - badgeSize) && event.y <= badgeSize
            if (tappedCloseBadge) {
              dismissed = true
              removeBubble()
            } else {
              openApp()
            }
          }
          true
        }
        else -> false
      }
    }

    windowManager?.addView(bubbleView, params)
  }

  private fun openApp() {
    val launchIntent = Intent(this, MainActivity::class.java)
    launchIntent.flags =
        Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
    startActivity(launchIntent)
  }

  private fun removeBubble() {
    bubbleView?.let {
      windowManager?.removeView(it)
      bubbleView = null
    }
    stopSelf()
  }

  override fun onDestroy() {
    removeBubble()
    super.onDestroy()
  }
}
