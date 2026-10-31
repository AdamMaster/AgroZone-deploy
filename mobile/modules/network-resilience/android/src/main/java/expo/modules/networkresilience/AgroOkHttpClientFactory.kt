package expo.modules.networkresilience

import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import java.util.concurrent.TimeUnit
import okhttp3.ConnectionPool
import okhttp3.OkHttpClient

/**
 * HTTP-клиент приложения вместо стандартного клиента React Native.
 *
 * Стандартный клиент ждёт ответа бесконечно и не проверяет, жива ли связь с
 * сервером. Пока телефон лежит, сеть тихо обрывает соединение, а приложение
 * об этом не знает; сервер работает по HTTP/2, где все запросы идут по одному
 * общему соединению, поэтому после возвращения в приложение каждый запрос
 * уходит в «мёртвое» соединение и висит, пока приложение не перезапустят.
 *
 * Здесь это закрыто тремя способами:
 *  - ping по соединению раз в [PING_INTERVAL_SECONDS] секунд: не пришёл ответ —
 *    соединение закрывается, а запрос уходит по новому;
 *  - простаивающие соединения живут не дольше [KEEP_ALIVE_SECONDS] секунд;
 *  - таймауты подключения и ожидания вместо бесконечных.
 */
object AgroOkHttpClientFactory : OkHttpClientFactory {
  private const val MAX_IDLE_CONNECTIONS = 5
  private const val KEEP_ALIVE_SECONDS = 30L
  private const val PING_INTERVAL_SECONDS = 10L
  private const val CONNECT_TIMEOUT_SECONDS = 10L
  private const val IO_TIMEOUT_SECONDS = 60L

  // Один пул на все клиенты: expo/fetch строит свой клиент от нашего
  // (newBuilder), и общий пул позволяет сбросить соединения одним вызовом.
  private val connectionPool = ConnectionPool(MAX_IDLE_CONNECTIONS, KEEP_ALIVE_SECONDS, TimeUnit.SECONDS)

  override fun createNewNetworkModuleClient(): OkHttpClient =
    // Стартуем с клиента React Native: он ставит cookie-контейнер, который
    // нужен expo/fetch.
    OkHttpClientProvider.createClientBuilder()
      .connectionPool(connectionPool)
      .pingInterval(PING_INTERVAL_SECONDS, TimeUnit.SECONDS)
      .connectTimeout(CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
      .readTimeout(IO_TIMEOUT_SECONDS, TimeUnit.SECONDS)
      .writeTimeout(IO_TIMEOUT_SECONDS, TimeUnit.SECONDS)
      .build()

  /** Закрывает все простаивающие соединения: следующий запрос откроет новое. */
  fun evictIdleConnections() {
    connectionPool.evictAll()
  }
}
