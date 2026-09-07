import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type CookieConsentStatus = 'accepted' | 'declined' | null

interface CookieConsentStore {
  status: CookieConsentStatus
  // Когда сделан текущий выбор (Date.now()) — нужно, чтобы решить, не
  // истёк ли он (см. COOKIE_CONSENT_TTL_MS). null, пока выбора нет.
  decidedAt: number | null
  accept: () => void
  decline: () => void
  // Сбрасывает выбор к исходному состоянию — баннер покажется снова.
  // Используется CookieConsentBanner, когда COOKIE_CONSENT_TTL_MS истёк.
  reset: () => void
}

// B4 в ROADMAP.md: выбор пользователя должен запоминаться на год, а не
// бессрочно — по истечении срока баннер нужно показать заново.
export const COOKIE_CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000

// Баннер согласия на использование cookie (см. CookieConsentBanner).
// Сейчас на сайте нет сторонних трекеров (Яндекс.Метрика/GA появятся
// позже, см. F15 в роадмапе) — используется только сессионная cookie для
// авторизации, но баннер нужен уже сейчас как юридическая гигиена. Когда
// F15 будет реализован, счётчики должны загружаться только при
// status === 'accepted' — «Отклонить» означает, что ставятся только
// технические cookie (авторизация), без аналитики.
// Выбор пользователя ("принять"/"отклонить") запоминается через
// localStorage (тот же паттерн, что и useHomeLocationStore), чтобы баннер
// не показывался повторно на каждой странице — но не дольше
// COOKIE_CONSENT_TTL_MS.
export const useCookieConsentStore = create<CookieConsentStore>()(
  persist(
    set => ({
      status: null,
      decidedAt: null,
      accept: () => set({ status: 'accepted', decidedAt: Date.now() }),
      decline: () => set({ status: 'declined', decidedAt: Date.now() }),
      reset: () => set({ status: null, decidedAt: null })
    }),
    { name: 'cookie-consent' }
  )
)
