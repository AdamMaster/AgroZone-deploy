import { ForgotPasswordFlow } from '@/features/auth/components/forgot-password-flow'

import { FormScreen } from '@/shared/components/form-screen'

export default function ForgotPasswordScreen() {
  return (
    <FormScreen>
      <ForgotPasswordFlow />
    </FormScreen>
  )
}
