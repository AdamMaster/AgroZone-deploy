package expo.modules.rustorepush

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import ru.rustore.sdk.pushclient.RuStorePushClient

// Тонкая обёртка над RuStore Push SDK: приложению нужен только токен
// устройства. SDK инициализируется сам по project_id из AndroidManifest (его
// прописывает plugins/with-rustore-push.js), показ уведомлений тоже на нём:
// сервер шлёт push с заголовком и текстом, SDK выводит их и открывает ссылку.
class RuStorePushModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RuStorePush")

    // Токен устройства (создаётся при первом запросе). Не выходит, если на
    // телефоне нет RuStore, пользователь в нём не вошёл или нет сети — тогда
    // Promise отклоняется, а JS решает, что делать.
    AsyncFunction("getToken") { promise: Promise ->
      RuStorePushClient.getToken()
        .addOnSuccessListener { token -> promise.resolve(token) }
        .addOnFailureListener { error ->
          promise.reject("ERR_RUSTORE_PUSH", error.message ?: "RuStore Push: не удалось получить токен", error)
        }
    }
  }
}
