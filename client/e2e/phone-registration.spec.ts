import { FORM_SELECTOR } from './fixtures/auth-actions'
import { expect, test } from './fixtures/test'

// Регистрация по телефону с подтверждением звонком (см. FormRegisterSms) —
// один из двух живых способов завести аккаунт. Реального звонка тут нет:
// server/scripts/mock-zvonok-server.ts подменяет zvonok.com (см.
// ZVONOK_API_BASE_URL в server/.env.test) и сам считает звонок поступившим
// через ~1.5с после запроса подтверждения — это тест того, что фронт
// корректно ЖДЁТ и опрашивает статус (useSmsCallbackStatus, раз в 4с), а
// не мгновенно получает "подтверждено".
//
// Номер генерируется заново на каждый прогон (никогда не используем
// PRIMARY/SECONDARY_TEST_USER — это была бы уже существующая учётка, а тут
// нужна именно новая регистрация), поэтому тест не зависит от состояния
// тестовой БД и не требует её сброса между прогонами.
function generateFreshTestPhone(): string {
  // 11 цифр: '7' + '999' (условно фейковый префикс) + 7 цифр от текущего
  // времени — с практической точки зрения не пересекается между прогонами.
  const suffix = Date.now().toString().slice(-7)
  return `+7999${suffix}`
}

test.describe('Регистрация по телефону со звонком (мок Zvonok)', () => {
  test('полный цикл: телефон → ожидание звонка → имя/пароль → пользователь авторизован', async ({ page }) => {
    const phone = generateFreshTestPhone()

    await page.goto('/')
    await page.getByRole('button', { name: 'Вход и регистрация' }).click()

    // По умолчанию открывается форма входа — переключаемся на вкладку
    // "Регистрация" (см. authTabs в FormLogin/FormRegisterSms).
    await page.getByRole('button', { name: 'Регистрация', exact: true }).click()

    const phoneForm = page.locator(FORM_SELECTOR)
    await phoneForm.locator('input[type="tel"]').fill(phone)
    await phoneForm.locator('button[type="submit"]').click()

    // Шаг 2: экран ожидания звонка (см. FormRegisterSms, step === 2).
    await expect(page.getByText('Ждём звонка...')).toBeVisible()

    // Шаг 3 наступает автоматически, когда useSmsCallbackStatus увидит
    // confirmed:true (мок подтверждает звонок через 1.5с после confirm, а
    // фронт опрашивает раз в 4с) — ждём появления следующего шага формы, а
    // не спим фиксированное время.
    await expect(page.getByPlaceholder('Ваше имя')).toBeVisible({ timeout: 15_000 })

    const finalForm = page.locator(FORM_SELECTOR)
    await finalForm.getByPlaceholder('Ваше имя').fill('E2E Регистрация Тест')
    await finalForm.getByPlaceholder('Пароль').fill('e2ePhoneReg1')
    await finalForm.getByPlaceholder('Повторите пароль').fill('e2ePhoneReg1')
    await finalForm.getByRole('checkbox').check()
    await finalForm.locator('button[type="submit"]').click()

    // StatusMessage('register-sms-message') из AppModal.
    await expect(page.getByText('Регистрация прошла успешно!')).toBeVisible()
    await expect(page.getByText('Вы вошли в систему.')).toBeVisible()

    // Модалка закрывается сама через 2.5с (см. onFormFinalSubmit в
    // FormRegisterSms) — дожидаемся и проверяем, что пользователь реально
    // авторизован, а не просто увидел текст "успешно".
    await expect(page.getByLabel('Меню профиля')).toBeVisible({ timeout: 5_000 })
  })
})
