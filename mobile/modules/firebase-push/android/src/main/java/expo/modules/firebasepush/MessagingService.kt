package expo.modules.firebasepush

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

// Принимает push от FCM и сам показывает уведомление: сервер шлёт только data
// (title, body, link, conversationId), поэтому вид уведомления один и тот же,
// закрыто приложение или открыто. Нажатие открывает deep link (agrozone://chat/…).
class MessagingService : FirebaseMessagingService() {
  // Токен приложение запрашивает при каждом запуске (src/features/push), поэтому
  // отдельной обработки смены токена нет.
  override fun onNewToken(token: String) {}

  @SuppressLint("MissingPermission")
  override fun onMessageReceived(message: RemoteMessage) {
    val data = message.data
    val title = data["title"]?.takeIf { it.isNotBlank() } ?: return
    val body = data["body"].orEmpty()
    val link = data["link"]
    val conversationId = data["conversationId"]

    val manager = NotificationManagerCompat.from(this)
    // Разрешение на уведомления не выдано (Android 13+) — показывать нечего.
    if (!manager.areNotificationsEnabled()) return

    createChannel()

    // Одно уведомление на диалог: новое сообщение заменяет прежнее (тот же id),
    // а не складывает десяток одинаковых.
    val notificationId = (conversationId ?: title).hashCode()

    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_agrozone)
      .setColor(Color.parseColor(BRAND_COLOR))
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setCategory(NotificationCompat.CATEGORY_MESSAGE)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      // Следующее сообщение того же чата обновляет текст в этом же уведомлении и
      // не звенит повторно (пока человек не смахнул его — тогда звонок снова).
      .setOnlyAlertOnce(true)
      .setAutoCancel(true)
      .setContentIntent(contentIntent(link, notificationId))
      .build()

    manager.notify(notificationId, notification)
  }

  // Ссылка открывает нужный экран; без ссылки — просто приложение.
  private fun contentIntent(link: String?, requestCode: Int): PendingIntent {
    val intent =
      if (!link.isNullOrBlank()) {
        Intent(Intent.ACTION_VIEW, Uri.parse(link)).setPackage(packageName)
      } else {
        packageManager.getLaunchIntentForPackage(packageName) ?: Intent()
      }.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)

    return PendingIntent.getActivity(
      this,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return

    manager.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Сообщения", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Новые сообщения в чатах"
      }
    )
  }

  private companion object {
    const val CHANNEL_ID = "messages"
    const val BRAND_COLOR = "#40A500"
  }
}
