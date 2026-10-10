import { useEffect, useState } from 'react'

// Значение, которое обновляется только после паузы во вводе: запрос
// подсказок уходит, когда пользователь перестал печатать, а не на каждую
// букву.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
