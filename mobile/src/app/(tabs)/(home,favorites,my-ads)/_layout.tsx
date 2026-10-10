import { Stack } from 'expo-router'

// Стеки вкладок «Главная», «Избранное» и «Объявления». Страница объявления
// открывается внутри той вкладки, откуда её открыли: нижняя панель
// остаётся на месте (как на сайте), а «Назад» возвращает к списку этой
// вкладки. Первый экран каждого стека — сам раздел вкладки.
export const unstable_settings = {
  home: { initialRouteName: 'index' },
  favorites: { initialRouteName: 'favorites' },
  'my-ads': { initialRouteName: 'my-ads' }
}

export default function TabStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
