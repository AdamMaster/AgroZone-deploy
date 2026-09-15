import { FORM_SELECTOR } from './fixtures/auth-actions'
import { PRIMARY_TEST_USER } from './fixtures/test-users'
import { expect, test } from './fixtures/test'

// Вход по телефону + паролю — единственный "прямой" (не через звонок и не
// через OAuth) способ войти, который реально доступен на UI (см. FormLogin).
// PRIMARY_TEST_USER здесь только читается — ни один из тестов ниже не
// меняет ни пароль, ни телефон этого пользователя, так что файл безопасно
// гонять сколько угодно раз подряд без сброса тестовой БД.
test.describe('Вход по телефону и паролю', () => {
  test('успешный вход показывает пользователя как авторизованного', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Вход и регистрация' }).click()

    const form = page.locator(FORM_SELECTOR)
    await form.getByPlaceholder('Почта или номер телефона').fill(PRIMARY_TEST_USER.phone)
    await form.getByPlaceholder('Пароль').fill(PRIMARY_TEST_USER.password)
    await form.locator('button[type="submit"]').click()

    await expect(page.getByText('Вы успешно вошли в аккаунт!')).toBeVisible()

    // useLoginMutation делает router.push('/profile/settings'), а
    // SettingsPage сразу редиректит на /profile/settings/general — конечная
    // точка именно там.
    //
    // ВНИМАНИЕ (см. e2e/README.md, раздел про SESSION_NAME): если этот
    // waitForURL зависает и в итоге падает по таймауту, а браузер вместо
    // этого стоит на "/?auth=true&returnUrl=%2Fprofile%2Fsettings" — это
    // не баг теста. Это client/src/middleware.ts, который сверяет НАЗВАНИЕ
    // cookie-сессии как строку 'session', а server/.env.test называет её
    // 'e2e_session' (SESSION_NAME) для изоляции от обычной dev-сессии на
    // localhost. Из-за этого middleware считает авторизованного
    // пользователя гостем и отправляет его обратно на "/". Исправление —
    // см. README, оно должно быть применено ДО первого запуска этого файла.
    await page.waitForURL(/\/profile\/settings\/general/)

    // Модалка входа закрылась, а в шапке вместо кнопок гостя появилось меню
    // профиля.
    await expect(page.getByLabel('Меню профиля')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Вход и регистрация' })).not.toBeVisible()
  })

  test('неверный пароль показывает реальную ошибку с бэкенда', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Вход и регистрация' }).click()

    const form = page.locator(FORM_SELECTOR)
    await form.getByPlaceholder('Почта или номер телефона').fill(PRIMARY_TEST_USER.phone)
    await form.getByPlaceholder('Пароль').fill('совершенно-неверный-пароль')
    await form.locator('button[type="submit"]').click()

    // Точный текст из AuthService.login (server/src/auth/auth.service.ts) —
    // toastMessageHandler на фронте показывает error.message с бэкенда как
    // есть, без перефразирования.
    await expect(
      page.getByText('Неверный пароль. Пожалуйста, попробуйте еще раз, или восстановите пароль, если забыли его.')
    ).toBeVisible()

    // Пользователь не должен считаться вошедшим — модалка остаётся, кнопка
    // гостя в шапке никуда не делась.
    await expect(form).toBeVisible()
    await expect(page.getByLabel('Меню профиля')).toHaveCount(0)
  })

  test('несуществующий пользователь показывает реальную ошибку "не найден"', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Вход и регистрация' }).click()

    const form = page.locator(FORM_SELECTOR)
    // Заведомо не заведённый в тестовой БД номер — не пересекается ни с
    // PRIMARY_TEST_USER, ни с SECONDARY_TEST_USER (см. fixtures/test-users.ts).
    await form.getByPlaceholder('Почта или номер телефона').fill('+79997777777')
    await form.getByPlaceholder('Пароль').fill('любой-пароль-123')
    await form.locator('button[type="submit"]').click()

    // Точный текст из AuthService.login — NotFoundException при отсутствии
    // пользователя с таким телефоном/почтой.
    await expect(page.getByText('Пользователь не найден. Пожалуйста, проверьте введенные данные.')).toBeVisible()
  })
})
