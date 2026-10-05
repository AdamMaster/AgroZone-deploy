'use client'

import { useQuery } from '@tanstack/react-query'

import { adsService } from '../services'
import { IAd } from '../types/ad.types'

// Отдельный ключ кэша от useMyAd (['ad', id]) — там владельческая версия
// объявления (с rejectionReason и доступом к DRAFT/PENDING), тут —
// публичная страница просмотра. Смешивать эти кэши нельзя: разные права
// доступа и разный набор полей.
//
// initialData сделан обязательным (не `IAd | undefined`) намеренно: пока
// параметр допускал undefined, react-query не мог гарантировать, что
// `data` определён, и типизировал его как `IAd | undefined` — из-за этого
// TS ругался на каждое обращение к `ad.*` в AdDetail. У нас initialData
// всегда есть (объявление приходит с сервера через SSR-пропс), так что
// честнее и так и отразить это в типе — заодно react-query сам выводит
// `data: IAd` без `| undefined`.
//
// Публичный запрос делаем только для опубликованного объявления: у остальных
// (страница просмотра владельца — архив, черновик и т.д.) он вернул бы 404, а
// записывать просмотр владельцем собственного объявления не нужно. Тогда
// источник данных — сам initialData, который на странице владельца обновляет
// родитель (useMyAd).
export function useAd(id: string, initialData: IAd) {
  const isPublic = initialData.status === 'PUBLISHED'

  const { data, isLoading } = useQuery({
    queryKey: ['ad-public', id],
    // trackView: true — это и есть настоящий визит браузера (реальная кука
    // сессии, реальные IP/UA), в отличие от SSR-вызова adsService.findOne в
    // page.tsx (см. комментарий там же). Глобальный staleTime в
    // TanstackQueryProvider теперь не 0, так что staleTime: 0 выставлен
    // здесь точечно — несмотря на initialData этот запрос всё равно
    // уйдёт при монтировании, на нём и держится запись просмотра.
    queryFn: () => adsService.findOne(id, { trackView: true }),
    initialData,
    staleTime: 0,
    enabled: !!id && isPublic
  })

  return { ad: isPublic ? data : initialData, isLoading }
}
