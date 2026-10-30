package expo.modules.firebasepush

import com.google.firebase.messaging.FirebaseMessaging
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Тонкая обёртка над Firebase Cloud Messaging: приложению нужен только токен
// устройства. Показ уведомлений делает MessagingService (сервер шлёт
// сообщения только с data).
class FirebasePushModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FirebasePush")

    // Токен FCM. Отклоняется, если на телефоне нет сервисов Google, нет сети
    // или Google недоступен — тогда JS остаётся на RuStore.
    AsyncFunction("getToken") { promise: Promise ->
      try {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
          val token = task.result
          if (task.isSuccessful && !token.isNullOrEmpty()) {
            promise.resolve(token)
          } else {
            promise.reject(
              "ERR_FCM_PUSH",
              task.exception?.message ?: "FCM: не удалось получить токен",
              task.exception
            )
          }
        }
      } catch (error: Exception) {
        promise.reject("ERR_FCM_PUSH", error.message ?: "FCM: не удалось получить токен", error)
      }
    }
  }
}
