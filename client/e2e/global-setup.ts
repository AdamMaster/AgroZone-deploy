import { execSync } from 'child_process'
import path from 'path'

import { PRIMARY_TEST_USER, SECONDARY_TEST_USER, TestUser } from './fixtures/test-users'

// server/scripts/create-verified-user.ts работает напрямую с Postgres через
// POSTGRES_URI из .env.test (дергается через dotenv -e .env.test, см.
// npm-скрипт test:e2e:create-user в server/package.json) — поэтому этому
// скрипту не нужен запущенный NestJS-сервер, только доступная и
// смигрированная БД greenbase_test (npm run test:e2e:db:deploy).
const SERVER_DIR = path.resolve(__dirname, '..', '..', 'server')

function createTestUser(user: TestUser): void {
  // JSON.stringify заворачивает каждый аргумент в двойные кавычки — этого
  // достаточно и для cmd.exe на Windows (execSync по умолчанию использует
  // системный шелл), и для POSIX-шеллов, при том что в наших значениях нет
  // ни кавычек, ни спецсимволов шелла.
  const args = [user.phone, user.password, user.name].map(value => JSON.stringify(value)).join(' ')
  const command = `npm run test:e2e:create-user -- ${args}`

  try {
    execSync(command, { cwd: SERVER_DIR, stdio: 'pipe' })
    // eslint-disable-next-line no-console
    console.log(`[e2e global-setup] Тестовый пользователь ${user.phone} создан.`)
  } catch (error) {
    const stderr = (error as { stderr?: Buffer | string }).stderr
    const stderrText = Buffer.isBuffer(stderr) ? stderr.toString('utf-8') : (stderr ?? '')

    // create-verified-user.ts завершается кодом 1 и именно этим текстом,
    // если телефон уже привязан к какому-то аккаунту — ожидаемо при
    // повторном прогоне тестов против непустой тестовой БД (см. e2e/README.md,
    // раздел про сброс БД). Это не повод валить весь прогон: пользователь
    // уже есть и полностью пригоден для тестов.
    if (stderrText.includes('уже привязан к аккаунту')) {
      // eslint-disable-next-line no-console
      console.log(`[e2e global-setup] Тестовый пользователь ${user.phone} уже существует — пропускаем создание.`)
      return
    }

    throw new Error(
      `[e2e global-setup] Не удалось создать тестового пользователя ${user.phone}. ` +
        'Убедитесь, что: 1) Postgres поднят и доступен на порту из server/.env.test; ' +
        '2) база greenbase_test создана; 3) миграции применены командой ' +
        '"npm run test:e2e:db:deploy" в server/. ' +
        `Подробности из scripts/create-verified-user.ts: ${stderrText || (error as Error).message}`
    )
  }
}

export default function globalSetup(): void {
  createTestUser(PRIMARY_TEST_USER)
  createTestUser(SECONDARY_TEST_USER)
}
