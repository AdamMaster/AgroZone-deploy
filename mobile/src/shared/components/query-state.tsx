import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { Loader } from './loader'
import { ScreenMessage } from './screen-message'

interface QueryStateProps<TData> {
  query: UseQueryResult<TData>
  // Заголовок сообщения, если данные не загрузились («Не удалось загрузить профиль»).
  errorTitle: string
  children: (data: TData) => ReactNode
}

// Три состояния загрузки раздела: идёт загрузка — индикатор, данных нет —
// сообщение об ошибке с «Повторить», иначе содержимое.
export function QueryState<TData>({ query, errorTitle, children }: QueryStateProps<TData>) {
  if (query.isPending) return <Loader />

  if (query.data === undefined) {
    return (
      <ScreenMessage
        title={errorTitle}
        description={query.error?.message}
        action={{ title: 'Повторить', onPress: () => void query.refetch() }}
      />
    )
  }

  return children(query.data)
}
