import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'argon2'
import { Pool } from 'pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { normalizePhone } from '../src/libs/common/utils/phone.util'

// Разовый/по требованию скрипт — создаёт аккаунт продавцу вручную, минуя
// подтверждение звонком (Zvonok). Нужен для ситуаций, когда продавец сам
// согласился, что аккаунт заводит администратор (например, договорились
// по телефону/на встрече) — не для массовой регистрации без ведома
// пользователя.
//
// Запуск на сервере (см. DEPLOY.md — та же схема, что и у остальных
// scripts/*.ts):
//   docker compose -f docker-compose.prod.yml exec server \
//     npm run users:create-verified -- '<телефон>' '<пароль>' ['<имя>']
//
// Локально (dev):
//   npm run users:create-verified -- '<телефон>' '<пароль>' ['<имя>']
//
// Телефон — в любом читаемом формате ("+7 999 123-45-67", "89991234567" и
// т.п.), normalizePhone приводит его к тому же виду, что и обычная
// регистрация. Пароль — от 6 символов (то же ограничение, что и в
// RegisterDto). Имя — необязательно, по умолчанию "Продавец".
//
// ВАЖНО про 152-ФЗ: обычная регистрация фиксирует согласие на обработку
// персональных данных с IP и User-Agent реального браузера пользователя
// (см. PersonalDataConsent в schema.prisma, UserService.create). Здесь
// такого контекста нет — аккаунт создаёт администратор из консоли, а не
// сам пользователь через форму. Поэтому personalDataConsentAt сознательно
// НЕ проставляется этим скриптом — считайте, что согласие ещё не
// зафиксировано формально, даже если продавец согласился устно. Получить
// его нужно отдельно (например, показать пользователю форму
// пользовательского соглашения при первом входе — это не реализовано
// автоматически, история согласия ведётся только через обычную форму
// регистрации).

const pool = new Pool({ connectionString: process.env.POSTGRES_URI })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function run() {
  const [rawPhone, password, displayNameArg] = process.argv.slice(2)

  if (!rawPhone || !password) {
    console.error('Использование: npm run users:create-verified -- <телефон> <пароль> [имя]')
    process.exitCode = 1
    return
  }

  if (password.length < 6) {
    console.error('Пароль должен содержать минимум 6 символов (см. RegisterDto).')
    process.exitCode = 1
    return
  }

  const displayName = displayNameArg?.trim() || 'Продавец'
  const phone = normalizePhone(rawPhone)

  const existing = await prisma.userPhone.findUnique({ where: { phone } })

  if (existing) {
    console.error(`Телефон ${phone} уже привязан к аккаунту ${existing.userId} — ничего не создано.`)
    process.exitCode = 1
    return
  }

  const passwordHash = await hash(password)

  const user = await prisma.user.create({
    data: {
      email: null,
      password: passwordHash,
      displayName,
      picture: '',
      method: 'CREDENTIALS',
      // isVerified — общий флаг подтверждённости аккаунта (используется,
      // например, чтобы отличать неподтверждённые email-регистрации).
      // Ставим true: телефон ниже помечен isVerified: true, и с точки
      // зрения приложения аккаунт полностью рабочий, как после обычного
      // прохождения звонка Zvonok.
      isVerified: true,
      phones: {
        create: {
          phone,
          isPrimary: true,
          isVerified: true
        }
      }
    },
    include: { phones: true }
  })

  console.log('Аккаунт создан:')
  console.log(`  id:     ${user.id}`)
  console.log(`  имя:    ${user.displayName}`)
  console.log(`  телефон: ${phone}`)
  console.log('Продавец сможет войти на сайте через форму "Войти" — телефон + пароль.')
  console.log(
    'Согласие на обработку персональных данных НЕ зафиксировано автоматически — см. комментарий в начале файла.'
  )
}

run()
  .catch(error => {
    console.error('Не удалось создать аккаунт:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
