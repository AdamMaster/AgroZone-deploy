// next-themes рендерит служебный <script> прямо внутри дерева React (см.
// ThemeScript в его исходниках), чтобы применить класс темы к <html> ДО
// гидратации — без этого при перезагрузке страницы на долю секунды
// мелькала бы не та тема (FOUC). Сам скрипт отрабатывает корректно: он
// часть исходного HTML, который парсит браузер, и просто выполняется как
// обычный инлайн-скрипт при загрузке страницы.
//
// React 19 добавил dev-only предупреждение на ЛЮБОЙ <script>-тег внутри
// компонента, не разбирая этот конкретный (легитимный, SSR-only) случай —
// это подтверждённый ложноположительный warning, а не баг в приложении:
//   https://github.com/pacocoursey/next-themes/issues/387
//   https://github.com/shadcn-ui/ui/issues/10104
// next-themes не обновлялся с марта 2025, апстрим-фикса пока нет; shadcn/ui
// в своей документации по тёмной теме рекомендует то же самое точечное
// подавление именно этого сообщения в дев-консоли.
//
// В продакшен-сборке (next build) React работает не в dev-режиме, и это
// предупреждение там в принципе не печатается — фильтр ничего не меняет
// в проде, только убирает шум с локальной консоли при разработке.
//
// Как только выйдет версия next-themes с фиксом — удалить этот файл и его
// импорт в main-provider.tsx.
const NEXT_THEMES_SCRIPT_WARNING = 'Encountered a script tag while rendering React component'

if (process.env.NODE_ENV === 'development') {
  const originalConsoleError = console.error

  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes(NEXT_THEMES_SCRIPT_WARNING)) {
      return
    }

    originalConsoleError(...args)
  }
}
