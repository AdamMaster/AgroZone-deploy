import { Stack } from 'expo-router'

// Стеки всех вкладок. Страница объявления и переписка открываются внутри
// той вкладки, откуда их открыли (объявление — из уведомления в «Профиле»
// или из чата, переписка — по «Написать» со страницы объявления): нижняя
// панель остаётся на месте (как на сайте), а «Назад» возвращает туда, где
// пользователь был. Первый экран каждого стека — сам раздел вкладки.
export const unstable_settings = {
  home: { initialRouteName: 'index' },
  favorites: { initialRouteName: 'favorites' },
  'my-ads': { initialRouteName: 'my-ads' },
  profile: { initialRouteName: 'profile/index' },
  messages: { initialRouteName: 'messages/index' }
}

export default function TabStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
