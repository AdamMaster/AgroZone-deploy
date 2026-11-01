import type { SessionData } from 'express-session'

// Сессия действует, пока её номер «поколения» совпадает с номером
// пользователя (User.sessionVersion). Смена или сброс пароля увеличивает номер
// пользователя, и все сессии, открытые раньше, перестают пускать. У сессий,
// открытых до появления этого поля, номера нет — считаем его нулевым, как и
// значение по умолчанию у пользователя.
export function isSessionCurrent(session: Partial<SessionData> | undefined, user: { sessionVersion: number }): boolean {
  return (session?.sessionVersion ?? 0) === user.sessionVersion
}
