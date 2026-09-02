import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WelcomeBannerStore {
  dismissed: boolean
  dismiss: () => void
}

// Приветственный баннер на главной для новых посетителей (см.
// WelcomeBanner) — объясняет, почему объявлений пока немного, и зовёт
// разместить первое объявление. Факт закрытия баннера запоминается через
// localStorage (тот же паттерн, что и useCookieConsentStore), чтобы он не
// показывался повторно тем, кто его уже закрыл.
export const useWelcomeBannerStore = create<WelcomeBannerStore>()(
  persist(
    set => ({
      dismissed: false,
      dismiss: () => set({ dismissed: true })
    }),
    { name: 'welcome-banner' }
  )
)
