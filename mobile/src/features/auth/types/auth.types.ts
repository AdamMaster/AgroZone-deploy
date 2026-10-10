// Профиль текущего пользователя — ответ GET /users/profile и поле user в
// ответах на вход (UserService.getProfileForClient на сервере). Описаны
// только поля, которые использует приложение.
export interface UserProfile {
  id: string
  displayName: string | null
  email: string | null
  picture: string | null
  primaryPhone: string | null
  // Есть ли у аккаунта пароль: без него (вход только через Яндекс) удаление
  // аккаунта не спрашивает пароль.
  hasPassword: boolean
  // До какого момента действует премиум (null — нет премиума).
  premiumUntil: string | null
}

// Успешный вход/регистрация. sessionToken сервер присылает только
// приложению (заголовок X-Auth-Transport: token, см. api-client.ts).
export interface AuthSession {
  user: UserProfile
  sessionToken?: string
}

// Вход по паролю у аккаунта с двухфакторной защитой: сервер не открывает
// сессию, а отправляет код на почту и отвечает этим сообщением.
export interface TwoFactorRequired {
  message: string
}

export interface RegisterStartResponse {
  message: string
  // Номер, на который нужно позвонить для подтверждения телефона.
  callNumber: string
}

export interface RegisterCallStatus {
  confirmed: boolean
  // Когда звонок подтверждён — код, который нужно передать в завершение
  // регистрации (id проверки у провайдера звонков).
  code?: string
}
