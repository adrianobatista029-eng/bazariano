package com.mobileentregador

import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

// Sobe o motor JS sem abrir nenhuma tela pra rodar só a tarefa
// "LocationBootTask" (ver index.js) — ela confere se a sessão do entregador
// ainda é válida e, se for, chama o mesmo startLocationTracking() de sempre.
// O timeout é bem alto de propósito: o rastreamento não tem um fim
// natural (fica ouvindo o GPS indefinidamente), diferente de uma tarefa
// headless comum que termina rápido.
class LocationBootTaskService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: android.content.Intent?): HeadlessJsTaskConfig {
    return HeadlessJsTaskConfig(
        "LocationBootTask",
        Arguments.createMap(),
        30L * 24 * 60 * 60 * 1000, // ~30 dias — não existe "sem timeout" de
        // verdade na API, então usa um valor bem alto: o rastreamento fica
        // ouvindo o GPS indefinidamente enquanto o app roda.
        true // allowedInForeground
    )
  }
}
