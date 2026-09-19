'use client'

import { useEffect, useRef } from 'react'

interface UseInfiniteScrollTriggerOptions {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  // Что-то, меняющееся при каждой новой партии данных (обычно
  // ads.length) — форсирует пересоздание IntersectionObserver сразу после
  // того, как DOM вырос новыми карточками. Без этого короткие списки (где
  // сентинел не успевает покинуть viewport между подгрузками — например,
  // категория с малым количеством объявлений на большом экране) не
  // подгружали бы вторую страницу вообще: IntersectionObserver уведомляет
  // только о ПЕРЕСЕЧЕНИИ порога видимости, а не на каждый кадр, пока
  // элемент остаётся видимым — если сентинел был виден и остался виден
  // после ре-рендера, нового уведомления не будет, пока его не
  // пересоздать (наблюдение заново = мгновенная переоценка текущего
  // состояния, отдельно прописывать «а не виден ли он ещё» руками
  // не нужно).
  watchKey: number | string
  // Насколько раньше реального попадания в viewport запускать подгрузку —
  // чтобы пользователь не успевал долистать до пустого места внизу и не
  // видел паузу, пока идёт запрос. С запасом в районе экрана-полутора.
  rootMargin?: string
}

// Универсальный "подгрузи ещё, когда долистали до конца" — не завязан на
// объявления специально, чтобы его можно было переиспользовать для любого
// другого бесконечного списка (см. AdsClient — первое и пока единственное
// применение).
export function useInfiniteScrollTrigger({
  hasMore,
  isLoading,
  onLoadMore,
  watchKey,
  rootMargin = '640px'
}: UseInfiniteScrollTriggerOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // hasMore/isLoading/onLoadMore меняются на каждый чих (isFetchingNextPage
  // тикает туда-сюда, onLoadMore из react-query формально стабилен по
  // ссылке, но полагаться на это не стоит) — если положить их в deps
  // эффекта, IntersectionObserver будет пересоздаваться при каждом таком
  // изменении, а не только когда реально нужно (см. watchKey выше). Вместо
  // этого читаем актуальные значения через ref в момент срабатывания
  // колбэка, а сам эффект зависит только от rootMargin и watchKey.
  const stateRef = useRef({ hasMore, isLoading, onLoadMore })
  stateRef.current = { hasMore, isLoading, onLoadMore }

  useEffect(() => {
    const node = sentinelRef.current

    if (!node || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]

        if (!entry?.isIntersecting) return

        const { hasMore, isLoading, onLoadMore } = stateRef.current

        if (hasMore && !isLoading) onLoadMore()
      },
      { rootMargin }
    )

    observer.observe(node)

    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootMargin, watchKey])

  return sentinelRef
}
