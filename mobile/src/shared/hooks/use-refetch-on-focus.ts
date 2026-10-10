import { useFocusEffect } from 'expo-router'
import { useCallback, useRef } from 'react'

// Обновить данные, когда пользователь вернулся на экран (вкладка не
// пересоздаётся при переключении, и без этого показывала бы то, что было
// при первом открытии). Первый показ пропускаем — данные только что
// загрузились.
export function useRefetchOnFocus(refetch: () => unknown) {
  const isFirstFocusRef = useRef(true)

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false
        return
      }

      refetch()
    }, [refetch])
  )
}
