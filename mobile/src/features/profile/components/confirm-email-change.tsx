import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'

import { Loader } from '@/shared/components/loader'
import { ScreenMessage } from '@/shared/components/screen-message'

import { useConfirmEmailChange } from '../hooks/use-profile-mutations'

// Подтверждение почты по ссылке из письма, как EmailChangeConfirm сайта:
// токен из адреса уходит на сервер сразу при открытии. Ссылка
// https://agro-zone.ru/change-email?token=… открывается в приложении, если
// оно установлено, — её перенаправляет сюда app/+native-intent.ts (на сайте
// это страница /change-email, а в приложении тот же путь занят формой смены
// почты); иначе ссылка открывается на сайте.
export function ConfirmEmailChange() {
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token?: string }>()
  const { mutate: confirm, isSuccess, error } = useConfirmEmailChange()
  // Токен одноразовый: повторный вызов (двойной запуск эффекта) сообщил бы,
  // что ссылка недействительна, хотя почта уже подтверждена.
  const hasConfirmed = useRef(false)

  useEffect(() => {
    if (!token || hasConfirmed.current) return

    hasConfirmed.current = true
    confirm(token)
  }, [token, confirm])

  const goHome = { title: 'На главную', onPress: () => router.replace('/') }

  if (!token) {
    return (
      <ScreenMessage
        title='Ссылка недействительна'
        description='Запросите смену почты в приложении ещё раз.'
        action={goHome}
      />
    )
  }

  if (isSuccess) {
    return <ScreenMessage title='Почта подтверждена' description='Адрес привязан к вашему аккаунту.' action={goHome} />
  }

  if (error) {
    return <ScreenMessage title='Не удалось подтвердить почту' description={error.message} action={goHome} />
  }

  return <Loader />
}
