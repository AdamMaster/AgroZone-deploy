import { Stack, useRouter } from 'expo-router'

import { PhoneFlow } from './phone-flow'

// «Изменить номер» в профиле — выбранный или добавленный номер становится
// основным.
export function ChangePhoneFlow() {
  const router = useRouter()

  return (
    <>
      <Stack.Screen options={{ title: 'Изменить номер' }} />
      <PhoneFlow mode='profile' onDone={() => router.back()} />
    </>
  )
}
