package expo.modules.rustorepush

import ru.rustore.sdk.pushclient.messaging.exception.RuStorePushClientException
import ru.rustore.sdk.pushclient.messaging.model.RemoteMessage
import ru.rustore.sdk.pushclient.messaging.service.RuStoreMessagingService

// Сервис, через который RuStore доставляет события приложению. Уведомления с
// заголовком SDK показывает сам, а токен приложение запрашивает при каждом
// запуске (см. src/features/push), поэтому своей обработки здесь нет.
class MessagingService : RuStoreMessagingService() {
  override fun onNewToken(token: String) {}

  override fun onMessageReceived(message: RemoteMessage) {}

  override fun onDeletedMessages() {}

  override fun onError(errors: List<RuStorePushClientException>) {}
}
