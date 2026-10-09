import { RegisterFlow } from '@/features/auth/components/register-flow'

import { FormScreen } from '@/shared/components/form-screen'

export default function RegisterScreen() {
  return (
    <FormScreen>
      <RegisterFlow />
    </FormScreen>
  )
}
