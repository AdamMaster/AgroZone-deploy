import { useCallback, useEffect, useRef } from 'react'
import { AppState } from 'react-native'

import { openSitePage } from '@/shared/utils/open-site-page'

// Страница оплаты на сайте (премиум, «Поднять объявление») открывается во
// встроенном браузере поверх приложения. Вернувшись, пользователь должен
// видеть результат оплаты, а не данные до неё, поэтому по возвращении зовём
// onReturn (обычно refetch).
//
// Вернулся ли пользователь, платформы сообщают по-разному. iOS: приложение
// остаётся активным, зато промис openBrowserAsync завершается, когда браузер
// закрыли. Android: промис завершается сразу при открытии (type 'opened'), а
// браузер — отдельная Activity, поэтому приложение уходит в фон и снова
// становится активным (AppState).
export function usePaidSitePage(onReturn: () => void) {
  const isOpenRef = useRef(false)

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active' || !isOpenRef.current) return

      isOpenRef.current = false
      onReturn()
    })

    return () => subscription.remove()
  }, [onReturn])

  return useCallback(
    async (path: `/${string}`) => {
      isOpenRef.current = true
      const result = await openSitePage(path)

      if (result.type !== 'opened' && isOpenRef.current) {
        isOpenRef.current = false
        onReturn()
      }
    },
    [onReturn]
  )
}
