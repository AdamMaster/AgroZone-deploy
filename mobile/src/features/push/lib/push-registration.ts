import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import { PermissionsAndroid, Platform } from 'react-native'

import { pushApi } from '../api/push.api'
import { getRuStorePushToken } from './rustore-push'

// Спрашиваем разрешение на уведомления один раз за установку: если человек
// отказал, повторно системное окно всё равно не покажется, а пристававшее
// приложение раздражает. Передумает — включит в настройках телефона.
const UNREGISTER_TIMEOUT_MS = 3000

const PERMISSION_ASKED_KEY = 'agrozone.push-permission-asked'

// Токен этого устройства, который сервер уже знает: при выходе из аккаунта его
// нужно убрать с сервера, иначе пуши прежнего аккаунта продолжат приходить.
let registeredToken: string | null = null

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

    const token = await getRuStorePushToken()
    if (!token) return

    await pushApi.register('RUSTORE', token, Constants.expoConfig?.version)
    registeredToken = token
  } catch {
    // Сеть или сервер недоступны — повторим при следующем запуске.
  }
}

// Вызывается до выхода из аккаунта, пока сессия ещё действует. Сбой не
// мешает выйти.
export async function unregisterPushDevice(): Promise<void> {
  try {
    const token = registeredToken ?? (await getRuStorePushToken())
    if (!token) return

    // Не держим выход дольше пары секунд, если сеть зависла.
    await Promise.race([
      pushApi.unregister('RUSTORE', token),
      new Promise<void>(resolve => setTimeout(resolve, UNREGISTER_TIMEOUT_MS))
    ])
    registeredToken = null
  } catch {
    // Выход важнее: сервер сам забудет токен, когда RuStore сообщит о его
    // недействительности.
  }
}
