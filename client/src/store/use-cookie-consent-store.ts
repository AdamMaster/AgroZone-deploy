import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type CookieConsentStatus = 'accepted' | 'declined' | null

interface CookieConsentStore {
  status: CookieConsentStatus
  accept: () => void
  decline: () => void
}

// Баннер согласия на использование cookie (см. CookieConsentBanner).
// Сейчас на сайте нет сторонних трекеров (Яндекс.Метрика/GA появятся
// позже, см. Этап 2 роадмапа) — используется только сессионная cookie для
// авторизации, но баннер нужен уже сейчас как юридическая гигиена.
// Выбор пользователя ("принять"/"отклонить") запоминается через
// localStorage (тот же паттерн, что и useHomeLocationStore), чтобы баннер
// не показывался повторно на каждой странице.
export const useCookieConsentStore = create<CookieConsentStore>()(
  persist(
    set => ({
      status: null,
      accept: () => set({ status: 'accepted' }),
      decline: () => set({ status: 'declined' })
    }),
    { name: 'cookie-consent' }
  )
)
