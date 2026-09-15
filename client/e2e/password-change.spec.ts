import { FORM_SELECTOR, loginViaModal, logoutViaMenu } from './fixtures/auth-actions'
import { SECONDARY_TEST_USER } from './fixtures/test-users'
import { expect, test } from './fixtures/test'

// Используем SECONDARY_TEST_USER (а не PRIMARY, которого использует
// login.spec.ts) намеренно: этот файл реально меняет пароль пользователя в
// БД, а не только читает состояние. Первый тест меняет пароль и в конце
// сам возвращает его обратно на исходный SECONDARY_TEST_USER.password —
// это нужно, чтобы файл можно было гонять повторно против той же тестовой
// БД без ручного сброса (см. e2e/README.md).
const TEMPORARY_NEW_PASSWORD = 'e2eNewPass9'

test.describe('Смена пароля в настройках безопасности', () => {
  test('смена пароля с правильным текущим паролем реально применяется', async ({ page }) => {
    await loginViaModal(page, SECONDARY_TEST_USER.phone, SECONDARY_TEST_USER.password)

    await page.goto('/profile/settings/security')
    await page.getByRole('button', { name: 'Сменить пароль' }).click()

    const changeForm = page.locator(FORM_SELECTOR)
    await changeForm.getByPlaceholder('Текущий пароль').fill(SECONDARY_TEST_USER.password)
    await changeForm.getByPlaceholder('Новый пароль').fill(TEMPORARY_NEW_PASSWORD)
    await changeForm.getByPlaceholder('Подтвердить новый пароль').fill(TEMPORARY_NEW_PASSWORD)
    await changeForm.locator('button[type="submit"]').click()

    // StatusMessage('change-password-confirm') из AppModal.
    await expect(page.getByText('Пароль обновлен!')).toBeVisible()
    await expect(page.getByText('Ваши данные успешно сохранены.')).toBeVisible()

    // Реальная регрессионная проверка, а не просто "тост показался": выходим
    // из аккаунта и логинимся заново именно НОВЫМ паролем — если бы смена
    // пароля не долетела до БД (или долетела не туда), вход бы не прошёл.
    await page.keyboard.press('Escape') // закрываем StatusMessage-модалку
    await logoutViaMenu(page)
    await loginViaModal(page, SECONDARY_TEST_USER.phone, TEMPORARY_NEW_PASSWORD)
    await expect(page.getByLabel('Меню профиля')).toBeVisible()

    // Возвращаем пароль обратно к исходному — иначе повторный прогон этого
    // же файла (или login.spec.ts, если он когда-нибудь начнёт использовать
    // SECONDARY_TEST_USER) сломается на неверном пароле.
    await page.goto('/profile/settings/security')
    await page.getByRole('button', { name: 'Сменить пароль' }).click()

    const revertForm = page.locator(FORM_SELECTOR)
    await revertForm.getByPlaceholder('Текущий пароль').fill(TEMPORARY_NEW_PASSWORD)
    await revertForm.getByPlaceholder('Новый пароль').fill(SECONDARY_TEST_USER.password)
    await revertForm.getByPlaceholder('Подтвердить новый пароль').fill(SECONDARY_TEST_USER.password)
    await revertForm.locator('button[type="submit"]').click()

    await expect(page.getByText('Пароль обновлен!')).toBeVisible()
  })

  test('неверный текущий пароль показывает реальную ошибку и не меняет пароль', async ({ page }) => {
    await loginViaModal(page, SECONDARY_TEST_USER.phone, SECONDARY_TEST_USER.password)

    await page.goto('/profile/settings/security')
    await page.getByRole('button', { name: 'Сменить пароль' }).click()

    const form = page.locator(FORM_SELECTOR)
    await form.getByPlaceholder('Текущий пароль').fill('заведомо-неверный-пароль')
    await form.getByPlaceholder('Новый пароль').fill('какой-то-новый-987')
    await form.getByPlaceholder('Подтвердить новый пароль').fill('какой-то-новый-987')
    await form.locator('button[type="submit"]').click()

    // Точный текст из UserService.updatePassword (server/src/user/user.service.ts).
    await expect(page.getByText('Текущий пароль указан неверно')).toBeVisible()

    // Реальная проверка "пароль правда не изменился", а не только текст
    // ошибки: выходим и логинимся СТАРЫМ паролем — если бы валидация была
    // фиктивной и пароль всё-таки сменился, этот вход бы не прошёл.
    await page.keyboard.press('Escape')
    await logoutViaMenu(page)
    await loginViaModal(page, SECONDARY_TEST_USER.phone, SECONDARY_TEST_USER.password)
    await expect(page.getByLabel('Меню профиля')).toBeVisible()
  })
})
