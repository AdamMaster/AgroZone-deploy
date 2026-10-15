import { useState } from 'react'
import { RefreshControl, type RefreshControlProps } from 'react-native'

interface AppRefreshControlProps extends Omit<RefreshControlProps, 'refreshing' | 'onRefresh'> {
  onRefresh: () => Promise<unknown>
}

// Pull-to-refresh. Крутилка — только когда пользователь сам потянул экран:
// у запроса свой isRefetching, но он true и при фоновом обновлении (вернулись
// в приложение), а тут показывать крутилку не нужно. Остальные props
// (в том числе style и children, которые ScrollView передаёт на Android)
// отдаём RefreshControl как есть.
export function AppRefreshControl({ onRefresh, ...props }: AppRefreshControlProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <RefreshControl
      colorsClassName='accent-primary'
      tintColorClassName='accent-primary'
      {...props}
      refreshing={isRefreshing}
      onRefresh={() => void refresh()}
    />
  )
}
