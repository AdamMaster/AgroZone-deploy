import { redirect } from 'next/navigation'

// На десктопе сайдбар и так всегда виден рядом с контентом (см.
// profile/layout.tsx) — открывать пустой /profile/settings без выбранного
// раздела незачем, сразу уводим на "Личные данные". На мобилке сайдбара
// тоже нет, но хаб-страница больше не нужна — "Профиль" в MobileTabBar
// ведёт сразу на /profile/settings/general (см. PROFILE_HREF в
// mobile-tab-bar.tsx), а остальные разделы открываются бургером в шапке
// (см. header.tsx и ProfileMenuSheet).
export default function SettingsPage() {
  redirect('/profile/settings/general')
}
