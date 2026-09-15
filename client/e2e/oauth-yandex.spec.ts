import { expect, test } from './fixtures/test'

// Смоук-тест OAuth через Яндекс. Не пытается реально войти: вводить логин
// и пароль настоящего Яндекс-аккаунта в автотест нельзя ни при каких
// обстоятельствах (это чужие боевые учётные данные, и их пришлось бы
// где-то хранить). Проверяем только то, что полностью в зоне
// ответственности нашего приложения: клик по кнопке "Яндекс" уводит
// браузер на настоящий домен OAuth Яндекса с правильными параметрами
// запроса (см. YandexProvider и BaseOAuthService.getAuthUrl на сервере) —
// а не на что-то ещё, и не с обрезанными/неверными параметрами.
test.describe('OAuth через Яндекс (смоук)', () => {
  test('кнопка "Яндекс" ведёт на настоящий oauth.yandex.ru с верными параметрами', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Вход и регистрация' }).click()

    // AuthSocials.onClick сначала делает GET auth/oauth/connect/yandex
    // (возвращает { url }), а затем router.push(url) на этот внешний URL —
    // отсюда и реальная сетевая навигация, которую здесь ждём.
    await Promise.all([
      page.waitForURL(/^https:\/\/oauth\.yandex\.ru\/authorize/, { timeout: 15_000 }),
      page.getByRole('button', { name: 'Яндекс' }).click()
    ])

    const url = new URL(page.url())

    expect(url.origin + url.pathname).toBe('https://oauth.yandex.ru/authorize')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBeTruthy()
    // redirect_uri строится как `${APPLICATION_URL}/auth/oauth/callback/yandex`
    // (см. BaseOAuthService.getRedirectUrl) — сам домен/порт в
    // APPLICATION_URL тут намеренно не проверяем, важен путь колбэка.
    expect(url.searchParams.get('redirect_uri')).toContain('/auth/oauth/callback/yandex')
    // state — одноразовое значение для защиты от OAuth login CSRF (см.
    // AuthController.connect), должно быть непустым.
    expect(url.searchParams.get('state')).toBeTruthy()

    // Останавливаемся здесь намеренно: дальше идёт настоящая форма входа
    // Яндекса, а вводить туда реальные учётные данные в автотесте нельзя.
    await page.goBack()
  })
})
