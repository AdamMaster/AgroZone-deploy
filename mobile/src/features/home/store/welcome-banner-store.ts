import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface WelcomeBannerState {
  dismissed: boolean
  // Сохранённое значение прочитано с диска. До этого баннер не показываем,
  // иначе закрытый когда-то баннер мелькал бы при каждом запуске.
  hasHydrated: boolean
  dismiss: () => void
}

// Закрытый приветственный баннер не возвращается — как
// useWelcomeBannerStore сайта (там localStorage, здесь хранилище
// приложения).
export const useWelcomeBannerStore = create<WelcomeBannerState>()(
  persist(
    set => ({
      dismissed: false,
      hasHydrated: false,
      dismiss: () => set({ dismissed: true })
    }),
    {
      name: 'agrozone.welcome-banner',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ dismissed: state.dismissed }),
      onRehydrateStorage: () => () => useWelcomeBannerStore.setState({ hasHydrated: true })
    }
  )
)
