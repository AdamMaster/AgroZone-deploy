import * as Location from 'expo-location'
import { useCallback, useState } from 'react'

export interface Coords {
  lat: number
  lng: number
}

// Для поиска объявлений в радиусе десятков километров точность до сотни
// метров не нужна: низкая точность определяется быстрее и бережёт батарею.
const ACCURACY = Location.Accuracy.Balanced
// Недавно известная позиция (до 5 минут) подходит — так кнопка срабатывает
// мгновенно, как maximumAge у геолокации сайта.
const MAX_LAST_KNOWN_AGE_MS = 5 * 60_000

const PERMISSION_DENIED_MESSAGE =
  'Доступ к местоположению запрещён — разрешите его в настройках телефона или введите адрес вручную'
const LOCATE_FAILED_MESSAGE = 'Не удалось определить местоположение — попробуйте ввести адрес вручную'

// Текущее местоположение телефона — для «Использовать моё местоположение»
// (useGeolocation сайта). Возвращает промис: вызывающему нужно дождаться
// координат и сразу запросить по ним подпись-адрес.
export function useCurrentPosition() {
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const locate = useCallback(async (): Promise<Coords | null> => {
    setIsLocating(true)
    setError(null)

    try {
      const permission = await Location.requestForegroundPermissionsAsync()

      if (!permission.granted) {
        setError(PERMISSION_DENIED_MESSAGE)
        return null
      }

      const position =
        (await Location.getLastKnownPositionAsync({ maxAge: MAX_LAST_KNOWN_AGE_MS })) ??
        (await Location.getCurrentPositionAsync({ accuracy: ACCURACY }))

      return { lat: position.coords.latitude, lng: position.coords.longitude }
    } catch {
      // Выключена геолокация в системе, нет сигнала, истекло ожидание.
      setError(LOCATE_FAILED_MESSAGE)
      return null
    } finally {
      setIsLocating(false)
    }
  }, [])

  return { locate, isLocating, error }
}
