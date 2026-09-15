import { FORM_SELECTOR, loginViaModal, logoutViaMenu } from './fixtures/auth-actions'
import { waitForEmailChangeConfirmationPath } from './fixtures/mailpit'
import { PRIMARY_TEST_USER } from './fixtures/test-users'
import { expect, test } from './fixtures/test'

// PRIMARY_TEST_USER изначально создаётся без почты (create-verified-user.ts
// заводит только телефон), так что первый прогон этого теста — это
// "привязка" почты, а не "смена" — форма и правда по-разному подписана в
// этих двух случаях (см. FormEmailChange: heading/placeholder зависят от
// user?.email). Каждый прогон генерирует свежий случайный адрес, поэтому
// тест идемпотентен: его можно гонять повторно без сброса БД, просто
// каждый раз почта аккаунта будет становиться новой случайной строкой -
// не мешает ни этому тесту, ни login.spec.ts (тот логинится по телефону, не
// по почте).
test.describe('Смена (привязка) почты + подтверждение по письму', () => {
  test('запрос смены почты, подтверждение ссылкой из Mailpit, вход новой почтой', async ({ page }) => {
    const newEmail = `e2e-${Date.now()}@example.com`

    await loginViaModal(page, PRIMARY_TEST_USER.phone, PRIMARY_TEST_USER.password)
    await page.goto('/profile/settings/general')

    // Кнопка рядом с полем "Почта" — берём именно по DOM-соседству с
    // input[type="email"], а не по тексту кнопки: подпись зависит от того,
    // есть ли уже почта ("Добавить почту" / "Изменить"), и вторая надпись
    // "Изменить" точно так же используется у соседнего поля телефона (см.
    // ContentGeneral) — нельзя было бы отличить по одному только тексту.
    const emailFieldWrapper = page.locator('div:has(> input[type="email"])')
    await emailFieldWrapper.getByRole('button').click()

    const requestForm = page.locator(FORM_SELECTOR)
    await requestForm.locator('input[type="email"]').fill(newEmail)
    await requestForm.getByPlaceholder('Пароль').fill(PRIMARY_TEST_USER.password)
    await requestForm.locator('button[type="submit"]').click()

    // StatusMessage('change-email-message') из AppModal.
    await expect(page.getByText('Запрос отправлен')).toBeVisible()
    await expect(page.getByText('Проверьте новую почту для подтверждения изменений.')).toBeVisible()

    // Реальная почта из Mailpit, а не перехват токена из сети/БД в обход
    // приложения — см. e2e/fixtures/mailpit.ts.
    const confirmPath = await waitForEmailChangeConfirmationPath(newEmail)

    await page.keyboard.press('Escape') // закрываем StatusMessage-модалку
    await page.goto(confirmPath)

    // EmailChangeConfirm сама дёргает confirm() при монтировании страницы и
    // по успеху делает toast.success('Почта успешно изменена') +
    // router.push('/profile/settings').
    await expect(page.getByText('Почта успешно изменена')).toBeVisible()
    await page.waitForURL(/\/profile\/settings/)

    // Реальная регрессионная проверка: выходим и логинимся именно новой
    // почтой (а не телефоном) — если бы email в БД не обновился, вход бы не
    // нашёл пользователя.
    await logoutViaMenu(page)
    await loginViaModal(page, newEmail, PRIMARY_TEST_USER.password)
    await expect(page.getByLabel('Меню профиля')).toBeVisible()
  })
})
