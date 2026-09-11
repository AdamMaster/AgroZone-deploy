declare global {
  interface Window {
    ym?: (counterId: number, action: string, ...rest: unknown[]) => void
  }
}

// Идентификатор счётчика Яндекс.Метрики (F15 в ROADMAP.md) — из
// NEXT_PUBLIC_YANDEX_METRIKA_ID (см. YandexMetrika, components/layout, и
// DEPLOY.md п.3.1). Пока переменная не задана — счётчик не подключается
// вообще, а reachGoal/trackPageview ниже безопасно ничего не делают, без
// ошибок в консоли и без падения сборки.
const METRIKA_COUNTER_ID = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID

// Идентификаторы целей. Сами вызовы reachGoal долетят до Метрики и без
// этого — но чтобы они попали в отчёты по конверсиям панели Метрики, для
// каждого нужно завести цель вручную: Настройки счётчика → Цели →
// добавить цель → «JavaScript-событие» → идентификатор ровно как здесь.
// Список — 5 сценариев из F15: поиск, показ телефона, сообщение продавцу,
// подача объявления, регистрация.
export const METRIKA_GOALS = {
  SEARCH: 'search',
  PHONE_REVEAL: 'phone_reveal',
  MESSAGE_TO_SELLER: 'message_to_seller',
  AD_SUBMIT: 'ad_submit',
  REGISTRATION: 'registration'
} as const

export type MetrikaGoal = (typeof METRIKA_GOALS)[keyof typeof METRIKA_GOALS]

function callYm(action: string, ...rest: unknown[]) {
  if (typeof window === 'undefined' || !window.ym || !METRIKA_COUNTER_ID) return

  try {
    window.ym(Number(METRIKA_COUNTER_ID), action, ...rest)
  } catch {
    // Метрика — вспомогательная аналитика, ошибка в ней не должна ронять
    // основной сценарий пользователя (отправку сообщения, подачу
    // объявления и т.п.).
  }
}

// Цель по одному из 5 сценариев F15. params — необязательные
// дополнительные параметры визита (например { query } для поиска),
// попадают в параметры визита в Метрике.
export function reachGoal(goal: MetrikaGoal, params?: Record<string, unknown>) {
  callYm('reachGoal', goal, params)
}

// Ручной pageview при SPA-переходе между страницами (см. YandexMetrika) —
// init-скрипт считает только самый первый заход, дальше App Router меняет
// страницы без перезагрузки, и без этого вызова Метрика видела бы один
// просмотр за весь визит независимо от того, сколько страниц открыл
// пользователь.
export function trackPageview(url: string) {
  callYm('hit', url)
}
