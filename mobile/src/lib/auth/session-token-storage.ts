import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Ключ сессии — то же, что cookie сессии на сайте: кто им владеет, тот
// действует от имени пользователя. Поэтому храним его только в защищённом
// хранилище системы (Keychain на iOS, Keystore на Android), а не в обычном
// хранилище приложения.
const STORAGE_KEY = 'agrozone.session-token'

// AFTER_FIRST_UNLOCK: ключ доступен после первой разблокировки телефона —
// в том числе приложению, проснувшемуся в фоне (например, от пуша).
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK
}

// SecureStore нет в вебе. Веб-сборка нужна только для проверки вёрстки,
// поэтому там ключ живёт лишь в памяти до перезагрузки страницы.
const isSecureStoreAvailable = Platform.OS !== 'web'

// Копия в памяти: заголовок Authorization подставляется в каждый запрос, и
// ходить за ним в Keychain каждый раз — лишняя асинхронная задержка.
let cachedToken: string | null = null

export const sessionTokenStorage = {
  async load(): Promise<string | null> {
    cachedToken = isSecureStoreAvailable ? await SecureStore.getItemAsync(STORAGE_KEY, STORE_OPTIONS) : cachedToken

    return cachedToken
  },

  get(): string | null {
    return cachedToken
  },

  async save(token: string): Promise<void> {
    cachedToken = token

    if (isSecureStoreAvailable) {
      await SecureStore.setItemAsync(STORAGE_KEY, token, STORE_OPTIONS)
    }
  },

  async clear(): Promise<void> {
    cachedToken = null

    if (isSecureStoreAvailable) {
      await SecureStore.deleteItemAsync(STORAGE_KEY, STORE_OPTIONS)
    }
  }
}
