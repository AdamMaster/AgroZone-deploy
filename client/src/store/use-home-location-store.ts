import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface HomeLocationValue {
  regionIsoCode?: string
  localityFiasId?: string
  label?: string
}

interface HomeLocationStore {
  location: HomeLocationValue
  setLocation: (location: HomeLocationValue) => void
  clearLocation: () => void
}

// Регион, который пользователь выбрал для ленты объявлений на ГЛАВНОЙ
// странице (см. HomeLocationPicker/HomeAdsFeed) — хранится в localStorage
// через zustand persist, без авторизации и без автоопределения по IP (см.
// обсуждение: пока объявлений мало, угадывать регион и сразу фильтровать
// по умолчанию рискованно — лента может оказаться пустой уже при первом
// визите, поэтому по умолчанию location пустой, то есть "вся Россия").
//
// Никак не связано с фильтром каталога (useCatalogFilters — хранится в
// URL как ?regionIsoCode=/?localityFiasId=) — это два независимых
// состояния, специально не переиспользуем одно для другого: выбор "своего
// города" на главной не должен молча подменять то, что пользователь явно
// выбрал в фильтре каталога, и наоборот.
export const useHomeLocationStore = create<HomeLocationStore>()(
  persist(
    set => ({
      location: {},
      setLocation: location => set({ location }),
      clearLocation: () => set({ location: {} })
    }),
    { name: 'home-location' }
  )
)
