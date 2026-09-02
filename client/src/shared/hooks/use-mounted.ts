'use client'

import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

// Признак "уже смонтировались на клиенте" — нужен, когда рендер должен
// отличаться от серверного (например, значение из localStorage или
// next-themes useTheme(), которых на сервере ещё нет). Раньше это делалось
// через useState(false) + useEffect(() => setState(true), []), но
// синхронный setState прямо в теле эффекта — то, от чего предостерегает
// react-hooks (see https://react.dev/learn/you-might-not-need-an-effect) и
// на что ругается линтер: "Calling setState synchronously within an effect
// can trigger cascading renders". useSyncExternalStore — официально
// рекомендуемый способ получить то же самое: getServerSnapshot возвращает
// false (то, что реально отрендерил сервер), getSnapshot — true, и React
// сам, без ручного эффекта, перерисовывает компонент сразу после гидратации.
export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}
