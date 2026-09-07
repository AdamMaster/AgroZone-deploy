'use client'

import { useCallback, useState } from 'react'

interface GeolocationCoords {
  lat: number
  lng: number
}

interface UseGeolocationState {
  isLocating: boolean
  error: string | null
}

// Геолокация браузера (F3, радиус-фильтр каталога — см.
// RadiusFilter) — единственное реально используемое место
// navigator.geolocation в проекте: до этого похожий код был только в
// закомментированном MapAd (2GIS-виджет, не подключён в ad-form.tsx),
// готового хука под это не было.
export function useGeolocation() {
  const [state, setState] = useState<UseGeolocationState>({ isLocating: false, error: null })

  // Промис, а не колбэк наружу — вызывающей стороне (RadiusFilter) нужно
  // дождаться координат, чтобы сразу следом дёрнуть реверс-геокодинг для
  // подписи, и всё это удобно записать одним async-обработчиком клика, а
  // не разводить по нескольким колбэкам.
  const locate = useCallback((): Promise<GeolocationCoords | null> => {
    return new Promise(resolve => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setState({ isLocating: false, error: 'Геолокация не поддерживается этим браузером' })
        resolve(null)
        return
      }

      setState({ isLocating: true, error: null })

      navigator.geolocation.getCurrentPosition(
        position => {
          setState({ isLocating: false, error: null })
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude })
        },
        error => {
          const message =
            error.code === error.PERMISSION_DENIED
              ? 'Доступ к местоположению запрещён — разрешите его в настройках браузера или введите адрес вручную'
              : 'Не удалось определить местоположение — попробуйте ввести адрес вручную'

          setState({ isLocating: false, error: message })
          resolve(null)
        },
        // enableHighAccuracy: false — для радиус-фильтра по объявлениям
        // точность в десятки метров не нужна, а без него определение
        // координат обычно быстрее и не запрашивает GPS-модуль лишний раз.
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
      )
    })
  }, [])

  return { locate, ...state }
}
