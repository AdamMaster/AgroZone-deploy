import { RegistrationGoalHandler } from '@/components/layout'

import { ContentGeneral } from '@/components/features/user/components'

export const dynamic = 'force-dynamic'

export default function ProfileSettingsGeneral() {
  return (
    <>
      {/* Невизуальный — см. RegistrationGoalHandler. Ловит ?newUser=1,
      которым сюда редиректит бэкенд после OAuth-регистрации (см.
      AuthController.callback), F15 в ROADMAP.md. */}
      <RegistrationGoalHandler />
      <ContentGeneral />
    </>
  )
}
