import Constants from 'expo-constants'
import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import { PermissionsAndroid, Platform } from 'react-native'

import { type PushProvider, pushApi } from '../api/push.api'
import { getFcmToken } from './firebase-push'
import { getRuStorePushToken } from './rustore-push'

// Спрашиваем разрешение на уведомления один раз за установку: если человек
// отказал, повторно системное окно всё равно не покажется, а пристававшее
// приложение раздражает. Передумает — включит в настройках телефона.
const UNREGISTER_TIMEOUT_MS = 3000

const PERMISSION_ASKED_KEY = 'agrozone.push-permission-asked'

const INSTALLATION_ID_KEY = 'agrozone.push-installation-id'

// Канал и токен этого устройства, которые сервер уже знает: при выходе из
// аккаунта их нужно убрать с сервера, иначе пуши прежнего аккаунта продолжат
// приходить.
let registeredDevice: { provider: PushProvider; token: string } | null = null

// Идентификатор установки: один на приложение, живёт до его удаления. По нему
// сервер не даёт одному телефону получать пуш по двум каналам сразу.
async function getInstallationId(): Promise<string | undefined> {
  try {
    const stored = await SecureStore.getItemAsync(INSTALLATION_ID_KEY)
    if (stored) return stored

    const created = Crypto.randomUUID()
    await SecureStore.setItemAsync(INSTALLATION_ID_KEY, created)

    return created
  } catch {
    return undefined
  }
}

// Канал по возможности Firebase (быстрая доставка, нужны сервисы Google), иначе
// RuStore (телефоны без Google или когда он недоступен).
async function pickPushChannel(): Promise<{ provider: PushProvider; token: string } | null> {
  const fcmToken = await getFcmToken()
  if (fcmToken) return { provider: 'FCM', token: fcmToken }

  const ruStoreToken = await getRuStorePushToken()
  if (ruStoreToken) return { provider: 'RUSTORE', token: ruStoreToken }

  return null
}

async function askNotificationPermissionOnce(): Promise<void> {
  if (Platform.OS !== 'android') return

  try {
    if (await SecureStore.getItemAsync(PERMISSION_ASKED_KEY)) return

    await SecureStore.setItemAsync(PERMISSION_ASKED_KEY, '1')
    // На Android до 13 разрешение выдано сразу, окна не будет.
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
  } catch {
    // Не получилось спросить — пуши просто могут не показываться; на вход и
    // работу приложения это влиять не должно.
  }
}

// Вызывается вошедшим пользователем: при запуске приложения и возвращении в
// него (токен может смениться, а RuStore — появиться на телефоне позже).
// Сервер обновляет запись по токену, повтор безвреден.
export async function registerPushDevice(): Promise<void> {
  try {
    await askNotificationPermissionOnce()

    const channel = await pickPushChannel()
    if (!channel) return

    const installationId = await getInstallationId()

    await pushApi.register(channel.provider, channel.token, Constants.expoConfig?.version, installationId)
    registeredDevice = channel

    // Установки до перехода на FCM регистрировали токен RuStore без
    // идентификатора установки: убираем его сами, иначе пуш придёт дважды.
    if (channel.provider === 'FCM') void dropLegacyRuStoreToken()
  } catch {
    // Сеть или сервер недоступны — повторим при следующем запуске.
  }
}

async function dropLegacyRuStoreToken(): Promise<void> {
  try {
    const token = await getRuStorePushToken()
    if (token) await pushApi.unregister('RUSTORE', token)
  } catch {
    // Не вышло — повторим при следующем запуске, пока работает FCM.
  }
}

// Вызывается до выхода из аккаунта, пока сессия ещё действует. Сбой не
// мешает выйти.
export async function unregisterPushDevice(): Promise<void> {
  try {
    const device = registeredDevice ?? (await pickPushChannel())
    if (!device) return

    // Не держим выход дольше пары секунд, если сеть зависла.
    await Promise.race([
      pushApi.unregister(device.provider, device.token),
      new Promise<void>(resolve => setTimeout(resolve, UNREGISTER_TIMEOUT_MS))
    ])
    registeredDevice = null
  } catch {
    // Выход важнее: сервер сам забудет токен, когда провайдер сообщит о его
    // недействительности.
  }
}
