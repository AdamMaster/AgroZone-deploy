'use client'

import { useEffect, useState } from 'react'

// Дебаунс произвольного значения (например, текста поискового поля) — не
// дёргает зависимый запрос на каждое нажатие клавиши, а ждёт `delay` мс
// тишины. Универсальный, без побочных эффектов помимо самого дебаунса —
// специфика конкретного поиска (что делать с результатом, когда включать
// запрос и т.п.) остаётся на стороне вызывающего хука, см.
// use-admin-users-search.ts.
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
