import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppDownloadBannerStore {
  dismissed: boolean
  dismiss: () => void
}

// Баннер «Скачать приложение» для Android-браузера (см. AppDownloadBanner).
// Закрытие запоминается в localStorage (тот же паттерн, что у
// useWelcomeBannerStore): баннер, который возвращается после каждого закрытия,
// раздражает сильнее, чем помогает.
export const useAppDownloadBannerStore = create<AppDownloadBannerStore>()(
  persist(
    set => ({
      dismissed: false,
      dismiss: () => set({ dismissed: true })
    }),
    { name: 'app-download-banner' }
  )
)
