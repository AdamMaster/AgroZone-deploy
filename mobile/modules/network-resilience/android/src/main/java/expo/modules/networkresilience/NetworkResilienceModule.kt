package expo.modules.networkresilience

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Даёт JS сбросить соединения с сервером: при возврате в приложение после
 * паузы и после запроса, который завис (см. src/lib/api/connection-reset.ts).
 */
class NetworkResilienceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NetworkResilience")

    Function("resetConnections") {
      AgroOkHttpClientFactory.evictIdleConnections()
    }
  }
}
