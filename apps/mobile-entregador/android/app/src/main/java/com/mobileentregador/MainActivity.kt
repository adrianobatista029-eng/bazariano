package com.mobileentregador

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "MobileEntregador"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  // Sem isso, toda vez que o Android mata o processo e depois tenta reabrir
  // a Activity a partir do estado salvo (ex.: voltando pelos apps recentes,
  // ou o próprio Android restaurando depois de matar por pouca memória), o
  // react-native-screens derruba o app na hora com
  // "Screen fragments should never be restored" — passar null em vez do
  // savedInstanceState real diz pro Android começar a tela do zero, que é
  // como o react-native-screens espera funcionar.
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }
}
