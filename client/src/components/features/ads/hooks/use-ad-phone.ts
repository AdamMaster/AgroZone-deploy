'use client'

import { useMutation } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services/ads.service'

// Раскрытие телефона продавца по клику "Показать телефон" (см. B2 в
// ROADMAP.md, AdDetail). Мутация, а не query — номер не должен грузиться
// сам по себе вместе с объявлением (в этом и был баг: GET /ads/:id раньше
// отдавал его сразу всем, без единого клика), только по явному действию
// пользователя. onSuccess — на вызывающей стороне (передаётся вторым
// аргументом в revealPhone), тут только общая обработка ошибки: гостю
// нужно сначала войти (401 — но AdDetail проверяет user и открывает
// логин-модалку раньше, чем вообще дёрнуть мутацию) либо превышен
// рейт-лимит — оба текста уже приходят с сервера человекочитаемыми (см.
// AuthGuard/AdPhoneThrottlerGuard).
export function useAdPhone() {
  const { mutate: revealPhone, isPending: isRevealingPhone } = useMutation({
    mutationKey: ['ad-phone'],
    mutationFn: (id: string) => adsService.getPhone(id),
    onError: toastMessageHandler
  })

  return { revealPhone, isRevealingPhone }
}
