import path from 'path'

import { defineConfig, devices } from '@playwright/test'

// Каталог сервера — нужен для webServer[1] (поднимаем настоящий NestJS
// поверх server/.env.test) и совпадает с тем, что использует
// e2e/global-setup.ts для скрипта создания тестовых пользователей.
const SERVER_DIR = path.resolve(__dirname, '..', 'server')

// ВАЖНО (см. e2e/README.md, раздел «Перед первым запуском»): этот конфиг
// сам поднимает клиент (test:e2e:client, порт 3001) и сервер
// (test:e2e:server, порт 4001) через webServer — но НЕ поднимает
// мок-сервер Zvonok, Mailpit, Postgres и Redis. Их нужно запустить заранее
// вручную (см. README) — иначе тесты будут падать не на конкретных
// проверках, а на самом первом обращении к API (регистрация/письма).
export default defineConfig({
  testDir: './e2e',

  // Один воркер намеренно: почти все спеки логинятся под общими
  // фикстурными пользователями (see e2e/fixtures/test-users.ts) и меняют их
  // состояние в БД (пароль, почта) — параллельный запуск нескольких файлов
  // означал бы гонки за одну и ту же строку в greenbase_test.
  workers: 1,
  fullyParallel: false,

  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  timeout: 45_000,
  expect: {
    // Чуть выше дефолта 5с — часть проверок реально ждёт сеть (Mailpit,
    // мок Zvonok, поллинг статуса звонка на фронте раз в 4с), а не просто
    // рендер DOM.
    timeout: 10_000
  },

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // globalSetup сеет фикстурных пользователей напрямую в БД (через
  // ts-node-скрипт, минуя HTTP) — не зависит от того, что webServer уже
  // готов, но Playwright всё равно поднимет оба процесса до начала тестов.
  globalSetup: require.resolve('./e2e/global-setup'),

  webServer: [
    {
      // client/package.json: cross-env SERVER_URL=http://localhost:4001 next dev -p 3001
      command: 'npm run test:e2e:client',
      cwd: __dirname,
      url: 'http://localhost:3001',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000
    },
    {
      // server/package.json: dotenv -e .env.test -- nest start
      command: 'npm run test:e2e:server',
      cwd: SERVER_DIR,
      url: 'http://localhost:4001',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000
    }
  ]
})
