'use client'

import { PropsWithChildren } from 'react'

import { SiteFlagsContext } from '../context/site-flags-context'
import { SiteFlags } from '../types/site-settings.types'

interface SiteFlagsProviderProps {
  flags: SiteFlags
}

// Флаги получает серверный (main)/layout.tsx и передаёт сюда готовыми:
// клиентским компонентам не нужен ни собственный запрос, ни состояние
// «загрузки», а значит, и мигания функции при открытии страницы.
export const SiteFlagsProvider = ({ flags, children }: PropsWithChildren<SiteFlagsProviderProps>) => {
  return <SiteFlagsContext.Provider value={flags}>{children}</SiteFlagsContext.Provider>
}
