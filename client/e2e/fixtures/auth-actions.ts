import type { Page } from '@playwright/test'

// Формы входа/регистрации/смены пароля/смены почты переиспользуют один и
// тот же <form id="form-rhf-demo"> внутри модалки (см. AppModal и
// соответствующие form-*.tsx) — везде в спеках сначала находим сам <form>,
// а уже внутри него нужные поля и submit-кнопку, чтобы не путать её с
// кнопками переключения вкладок "Войти"/"Регистрация" (тот же текст, но
// type="button", а не type="submit", и лежат вне <form>).
export const FORM_SELECTOR = 'form#form-rhf-demo'

/**
 * Открывает модалку логина с главной страницы и логинится по
 * телефону/почте + паролю. Ожидает, что логин пройдёт успешно (иначе тесты,
 * которые сначала логинятся, а потом проверяют что-то в /profile/settings,
 * должны явно проверять сообщение об ошибке сами, а не звать этот хелпер).
 */
export async function loginViaModal(page: Page, login: string, password: string): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Вход и регистрация' }).click()

  const form = page.locator(FORM_SELECTOR)
  await form.getByPlaceholder('Почта или номер телефона').fill(login)
  await form.getByPlaceholder('Пароль').fill(password)
  await form.locator('button[type="submit"]').click()

  // useLoginMutation при успехе делает router.push('/profile/settings'),
  // а SettingsPage (app/(main)/profile/settings/page.tsx) сразу редиректит
  // дальше на /profile/settings/general.
  await page.waitForURL(/\/profile\/settings/)
}

/**
 * Выходит из аккаунта через меню профиля в шапке (UserButton) и дожидается
 * возврата на главную — useLogoutMutation делает router.push('/?auth=true').
 */
export async function logoutViaMenu(page: Page): Promise<void> {
  await page.getByLabel('Меню профиля').click()
  await page.getByRole('menuitem', { name: 'Выйти' }).click()
  await page.waitForURL(/\/\?.*auth=true/)
}
