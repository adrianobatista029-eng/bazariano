package com.mobileentregador

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.app.Service
import android.content.Intent
import android.graphics.Outline
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.view.animation.LinearInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import kotlin.math.abs

// Desenha a bolha flutuante (estilo iFood/Uber Entregador) que fica visível
// sobre outros apps sempre que o entregador está online e o app está em
// segundo plano — não só durante uma entrega. Depende da permissão especial
// "Exibir sobre outros apps" (SYSTEM_ALERT_WINDOW), concedida manualmente
// pelo usuário nas configurações do Android — ver
// OverlayModule.requestOverlayPermission().
//
// A bússola fica parada e só as setas laranjas giram quando tem uma oferta
// de entrega esperando resposta (mesmo efeito do splash de abertura) — ver
// ACTION_ALERT_ON/OFF, disparado pela assinatura em tempo real de pedidos
// novos (ver src/lib/order-alerts.ts).
//
// Uma vez que o usuário toca no X da bolha, ela fica "descartada" (não
// reaparece ao sair do app de novo) até o próximo ACTION_RESET, disparado
// quando o entregador fica online de novo — igual ao comportamento do
// iFood/Uber.
class OverlayService : Service() {

  private var windowManager: WindowManager? = null
  private var bubbleView: View? = null
  private var arrowsView: ImageView? = null
  private var arrowsAnimator: ObjectAnimator? = null

  companion object {
    const val ACTION_SHOW = "SHOW_BUBBLE"
    const val ACTION_HIDE = "HIDE_BUBBLE"
    const val ACTION_RESET = "RESET_BUBBLE"
    const val ACTION_ALERT_ON = "ALERT_ON"
    const val ACTION_ALERT_OFF = "ALERT_OFF"
    private const val DRAG_THRESHOLD_PX = 12
    private var dismissed = false
    private var alertActive = false
    // Lembra onde o usuário arrastou a bolha da última vez, pra não voltar
    // sempre pro canto padrão quando ela reaparece.
    private var savedX: Int? = null
    private var savedY: Int = 300
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_HIDE -> removeBubble()
      ACTION_RESET -> dismissed = false
      ACTION_ALERT_ON -> {
        alertActive = true
        startAlertAnimation()
      }
      ACTION_ALERT_OFF -> {
        alertActive = false
        stopAlertAnimation()
      }
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
    val badgeSize = (18 * density).toInt()

    val baseView =
        ImageView(this).apply {
          setImageResource(R.drawable.overlay_bubble_base)
          scaleType = ImageView.ScaleType.CENTER_CROP
        }
    val arrows =
        ImageView(this).apply {
          setImageResource(R.drawable.overlay_bubble_arrows)
          scaleType = ImageView.ScaleType.CENTER_CROP
        }
    arrowsView = arrows

    val closeBadge =
        ImageView(this).apply {
          setImageResource(R.drawable.overlay_close)
          scaleType = ImageView.ScaleType.CENTER_INSIDE
          setBackgroundColor(android.graphics.Color.parseColor("#111827"))
          outlineProvider =
              object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                  outline.setOval(0, 0, view.width, view.height)
                }
              }
          clipToOutline = true
        }

    val root = FrameLayout(this)
    root.clipToOutline = true
    root.outlineProvider =
        object : ViewOutlineProvider() {
          override fun getOutline(view: View, outline: Outline) {
            outline.setOval(0, 0, view.width, view.height)
          }
        }
    root.addView(baseView, FrameLayout.LayoutParams(size, size))
    root.addView(arrows, FrameLayout.LayoutParams(size, size))
    root.addView(
        closeBadge,
        FrameLayout.LayoutParams(badgeSize, badgeSize, Gravity.TOP or Gravity.END))
    bubbleView = root

    if (alertActive) startAlertAnimation()

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
    val screenWidth = resources.displayMetrics.widthPixels
    params.x = savedX ?: (screenWidth - size)
    params.y = savedY

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
          } else {
            snapToNearestEdge(view, params)
          }
          true
        }
        else -> false
      }
    }

    windowManager?.addView(bubbleView, params)
  }

  // Solta a bolha grudando na lateral mais próxima (esquerda ou direita) —
  // igual "chat heads" do Messenger — em vez de deixar largada no meio da
  // tela atrapalhando o que está atrás. Também grava a posição pra próxima
  // vez que a bolha aparecer.
  private fun snapToNearestEdge(view: View, params: WindowManager.LayoutParams) {
    val screenWidth = resources.displayMetrics.widthPixels
    val bubbleCenterX = params.x + view.width / 2
    val targetX = if (bubbleCenterX < screenWidth / 2) 0 else screenWidth - view.width

    ValueAnimator.ofInt(params.x, targetX).apply {
      duration = 200
      addUpdateListener { anim ->
        params.x = anim.animatedValue as Int
        runCatching { windowManager?.updateViewLayout(view, params) }
      }
      start()
    }
    savedX = targetX
    savedY = params.y
  }

  private fun startAlertAnimation() {
    val view = arrowsView ?: return
    if (arrowsAnimator?.isRunning == true) return
    arrowsAnimator =
        ObjectAnimator.ofFloat(view, "rotation", 0f, 360f).apply {
          duration = 1400
          repeatCount = ValueAnimator.INFINITE
          interpolator = LinearInterpolator()
          start()
        }
  }

  private fun stopAlertAnimation() {
    arrowsAnimator?.cancel()
    arrowsAnimator = null
    arrowsView?.rotation = 0f
  }

  private fun openApp() {
    val launchIntent = Intent(this, MainActivity::class.java)
    launchIntent.flags =
        Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
    startActivity(launchIntent)
  }

  private fun removeBubble() {
    stopAlertAnimation()
    bubbleView?.let {
      windowManager?.removeView(it)
      bubbleView = null
      arrowsView = null
    }
    stopSelf()
  }

  override fun onDestroy() {
    removeBubble()
    super.onDestroy()
  }
}
