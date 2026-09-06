/**
 * "returnTo"/"returnUrl" (U1 в ROADMAP.md): куда вернуть гостя после входа
 * или регистрации — например, обратно на страницу объявления, чтобы сразу
 * открылся диалог с продавцом, или на форму создания объявления.
 *
 * Значение либо приходит от нас самих (жёстко прописанный href в коде —
 * `/ads/create`, `/profile/settings/messages?ad=...`), либо, для гостя,
 * пришедшего по прямой ссылке на защищённую /profile/*-страницу, — из
 * query-параметра `returnUrl`, который middleware.ts кладёт в редирект на
 * `/?auth=true`. Второй случай — уже НЕДОВЕРЕННЫЙ ввод: параметр виден и
 * управляем снаружи (кто угодно может прислать ссылку вида
 * `/?auth=true&returnUrl=https://evil.example/phishing`), и без проверки
 * `router.push(returnTo)` превратился бы в open redirect — вошедшего
 * пользователя можно было бы увести на чужой сайт сразу после входа.
 *
 * Поэтому каждое значение, прежде чем попасть в router.push, проходит
 * через isSafeReturnPath — пропускает только относительные пути внутри
 * самого приложения.
 */
export function isSafeReturnPath(value: string | null | undefined): value is string {
  if (!value) return false

  // Должен начинаться РОВНО с одного '/' — не с '//' и не с '/\',
  // которые браузер и часть URL-парсеров трактуют как protocol-relative
  // адрес (т.е. фактически переход на другой домен), и не содержать
  // '://' (абсолютный URL на другой домен под видом «пути»).
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return false
  if (value.includes('://')) return false

  return true
}
