import AsyncStorage from '@react-native-async-storage/async-storage'
import { Uniwind } from 'uniwind'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// Тема оформления, как в «Персонализации» сайта: светлая, тёмная или как в
// настройках телефона.
export type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeState {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

let markHydrated: () => void = () => undefined

// Выбор читается с диска при запуске; сплэш держится, пока он не применён
// (app/_layout.tsx), иначе при выбранной тёмной теме на миг мелькала бы
// светлая. Ошибка чтения — не повод висеть на сплэше: остаётся системная.
export const themeHydrated = new Promise<void>(resolve => {
  markHydrated = resolve
})

// Uniwind.setTheme перекрашивает классы и заодно переключает тему системных
// элементов приложения (Appearance): строки состояния, тостов, клавиатуры.
export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      preference: 'system',
      setPreference: preference => {
        Uniwind.setTheme(preference)
        set({ preference })
      }
    }),
    {
      name: 'agrozone.theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ preference: state.preference }),
      onRehydrateStorage: () => (state, error) => {
        if (state && !error) Uniwind.setTheme(state.preference)
        markHydrated()
      }
    }
  )
)
