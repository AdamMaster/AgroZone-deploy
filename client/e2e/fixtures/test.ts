import { test as base, expect } from '@playwright/test'

import { stubYandexCaptcha } from './captcha-stub'

// Общая test-фикстура для всех специков этого проекта: на каждой странице
// автоматически подменяет виджет Yandex SmartCaptcha (см. captcha-stub.ts),
// чтобы формы логина/регистрации/смены почты не зависели от реальной
// доступности стороннего сервиса и настройки разрешённых доменов для
// sitekey. Специки должны импортировать test/expect ОТСЮДА, а не напрямую
// из '@playwright/test' — иначе стаб не применится и формы с капчей
// зависнут.
export const test = base.extend({
  page: async ({ page }, use) => {
    await stubYandexCaptcha(page)
    await use(page)
  }
})

export { expect }
