import { Stack } from 'expo-router'

// Главная и открытые из неё каталоги — один стек внутри вкладки «Главная»:
// нижняя панель остаётся на месте, как на сайте.
export default function HomeStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
