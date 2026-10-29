import { usePushRegistration } from '../hooks/use-push-registration'

// Регистрация устройства для push, пока пользователь вошёл.
export function PushRegistration() {
  usePushRegistration()

  return null
}
