# AgroZone — мобильное приложение

iOS и Android на React Native + Expo (SDK 57, New Architecture, Hermes,
React Compiler). Ходит в тот же API, что и сайт (`server/`), своей базы нет.

## Стек

- **Expo Router** — навигация, экраны лежат в `src/app/` (каждый файл — экран).
- **Uniwind** — стили классами Tailwind v4, компилируются в нативные стили при
  сборке. Цвета и тема — в `src/global.css` (те же значения, что у сайта).
- **TanStack Query** — загрузка данных и кэш; **FlashList** — длинные списки;
  **expo-image** — картинки с дисковым кэшем; **zustand** — состояние входа;
  **react-hook-form + zod** — формы с теми же правилами, что на сайте.

## Вход

Сессии те же, что у сайта (Redis на сервере), только ключ сессии приложение
хранит в защищённом хранилище телефона (`expo-secure-store`) и отправляет в
заголовке `Authorization`, а не в cookie. Подробности — в
`server/src/session/session-token.ts`.

- Телефон и пароль — с Яндекс-капчей во встроенном окне, как на сайте.
- Регистрация — звонок на проверочный номер, затем имя и пароль.
- Яндекс ID — системное окно входа + одноразовый код и PKCE
  (`server/src/auth/mobile-oauth/`). В Expo Go возврат идёт на `exp://…`,
  в собранном приложении — на `agrozone://oauth`.

## Структура `src/`

- `app/` — экраны и навигация (только маршруты, без логики).
- `features/<раздел>/` — код раздела: `api/`, `hooks/`, `components/`, `types/`.
- `shared/` — общие компоненты, утилиты, константы.
- `lib/` — инфраструктура: HTTP-клиент, react-query.
- `providers/` — корневые провайдеры и тема навигации.
- `config/env.ts` — единственное место чтения переменных окружения.

## Запуск

```bash
cd mobile
cp .env.example .env   # один раз, затем впишите ключ капчи (см. комментарий в файле)
npm install
npx expo start
```

Откройте приложение **Expo Go** на телефоне (App Store / Google Play) и
отсканируйте QR-код из терминала. Телефон и компьютер должны быть в одной
сети Wi-Fi; если не видит — `npx expo start --tunnel`.

Пакеты с нативным кодом ставятся только через `npx expo install <пакет>` —
он подбирает версию, совместимую с текущим SDK.

## Проверки перед коммитом

```bash
npm run typecheck
npm run lint
npx prettier --check .
```

`src/uniwind-types.d.ts` генерирует Metro (при `npx expo start`) — руками его
не правят, но коммитят, чтобы `typecheck` работал и без запуска Metro.

## Сборка

Облачная сборка через EAS (Mac для iOS не нужен):

```bash
npx eas-cli@latest build --profile preview --platform android   # APK для тестов
npx eas-cli@latest build --profile production --platform all     # в магазины
```

Адреса и публичный ключ капчи для сборок заданы в `eas.json` (`env` у каждого профиля).
