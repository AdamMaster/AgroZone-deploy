// Подписи способов входа/регистрации — и для AuthMethod пользователя
// (CREDENTIALS/GOOGLE/YANDEX), и для провайдеров связанных OAuth-аккаунтов
// (provider приходит в нижнем регистре, поэтому ключи сравниваются через
// toUpperCase() — см. UserAdminDetail). Раньше жила локальной константой
// в карточке пользователя админки; вынесена, потому что та же подпись
// нужна и в журнале событий безопасности (SecurityEventsList).
export const AUTH_METHOD_LABELS: Record<string, string> = {
  CREDENTIALS: 'Телефон + пароль',
  GOOGLE: 'Google',
  YANDEX: 'Яндекс'
}
