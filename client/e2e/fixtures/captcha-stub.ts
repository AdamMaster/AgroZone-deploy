import type { Page } from '@playwright/test'

// URL, с которого @yandex/smart-captcha грузит виджет, когда host не задан
// явно (см. client/src/shared/hooks/use-yandex-captcha.tsx — там host не
// передаётся <InvisibleSmartCaptcha>, значит используется дефолт из самой
// библиотеки: node_modules/@yandex/smart-captcha/index.js, функция
// API_LINK -> 'https://smartcaptcha.cloud.yandex.ru/captcha.js?render=onload&onload=__onSmartCaptchaReady').
const CAPTCHA_SCRIPT_URL_PATTERN = 'https://smartcaptcha.cloud.yandex.ru/captcha.js**'

// Почему подменяем реальный виджет, а не полагаемся на настоящий Yandex
// Smart Captcha:
//
// 1. Сервер полностью пропускает проверку капчи в dev-режиме — см.
//    server/src/libs/captcha/captcha.guard.ts, CaptchaGuard.canActivate:
//    `if (isDev(this.configService)) return true`, а server/.env.test
//    держит NODE_ENV='development'. То есть даже настоящий валидный токен
//    от Яндекса сервер бы никак не проверял — значение токена для тестов
//    в принципе не важно.
// 2. Реальный invisible-виджет требует, чтобы домен (localhost:3001, на
//    котором крутится тестовый клиент) был явно разрешён в кабинете Yandex
//    Smart Captcha для используемого NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY.
//    Полагаться на это в автотестах ненадёжно — доступность стороннего
//    сервиса и точная настройка разрешённых доменов вне нашего контроля,
//    а без него executeCaptcha() в файлах form-*.tsx может просто зависнуть
//    навсегда (виджет не вызовет ни onSuccess, ни onChallengeHidden).
//
// Поэтому вместо настоящего captcha.js подсовываем минимальную реализацию
// того же публичного API (window.smartCaptcha.render/subscribe/execute/
// destroy — см. InvisibleSmartCaptcha в node_modules/@yandex/smart-captcha/index.js),
// которая сразу же "решает" капчу и синхронно (через микротаймаут) зовёт
// подписчиков события 'success' с фиктивным токеном.
const CAPTCHA_STUB_SCRIPT = `
(function () {
  var nextWidgetId = 1;
  var subscribers = {};

  function subscriptionKey(widgetId, eventName) {
    return widgetId + ':' + eventName;
  }

  window.smartCaptcha = {
    render: function () {
      return nextWidgetId++;
    },
    subscribe: function (widgetId, eventName, callback) {
      var key = subscriptionKey(widgetId, eventName);
      if (!subscribers[key]) subscribers[key] = [];
      subscribers[key].push(callback);
      return function unsubscribe() {
        var list = subscribers[key];
        if (!list) return;
        var index = list.indexOf(callback);
        if (index >= 0) list.splice(index, 1);
      };
    },
    execute: function (widgetId) {
      // Небольшая асинхронная задержка вместо мгновенного синхронного
      // вызова — форма проходит через тот же промис-based путь
      // (executeCaptcha() в use-yandex-captcha.tsx), что и в проде,
      // а не разрешается ещё до того, как React успел отрисовать
      // состояние "загрузка".
      setTimeout(function () {
        var list = subscribers[subscriptionKey(widgetId, 'success')] || [];
        list.slice().forEach(function (callback) {
          callback('e2e-stub-captcha-token');
        });
      }, 30);
    },
    destroy: function () {},
    setTheme: function () {}
  };

  if (typeof window.__onSmartCaptchaReady === 'function') {
    window.__onSmartCaptchaReady();
  }
})();
`

/**
 * Подменяет реальный скрипт Yandex SmartCaptcha на минимальный стаб (см.
 * комментарий у CAPTCHA_STUB_SCRIPT выше). Нужно вызывать ДО навигации на
 * страницу с формой — page.route применяется к последующим запросам этой
 * страницы, иначе форма реально попытается загрузить настоящий виджет и
 * может зависнуть в ожидании executeCaptcha().
 */
export async function stubYandexCaptcha(page: Page): Promise<void> {
  await page.route(CAPTCHA_SCRIPT_URL_PATTERN, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: CAPTCHA_STUB_SCRIPT
    })
  )
}
