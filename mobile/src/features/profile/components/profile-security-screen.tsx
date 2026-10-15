import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Text, View } from 'react-native'

import { useProfile } from '@/features/auth/hooks/use-profile'
import { profileQueryKey } from '@/features/auth/store/auth-store'

import { Button } from '@/shared/components/button'
import { Heading } from '@/shared/components/heading'
import { Input, InputAction } from '@/shared/components/input'
import { QueryState } from '@/shared/components/query-state'
import { Switch } from '@/shared/components/switch'

import { useToggleTwoFactor } from '../hooks/use-profile-mutations'
import { ProfileSectionScreen } from './profile-section-screen'
import { SecurityEventsSection } from './security-events-section'
import { SettingsCard } from './settings-card'

// «Безопасность» — как /profile/settings/security сайта: пароль,
// двухфакторная защита, журнал недавних действий и удаление аккаунта.
export function ProfileSecurityScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const profileQuery = useProfile()
  const { mutate: toggleTwoFactor, isPending: isTogglingTwoFactor } = useToggleTwoFactor()
  // Код второго фактора приходит на почту: без неё включить защиту нельзя
  // (сервер откажет), а уже включённую без почты выключить можно.
  const canToggleTwoFactor = !!profileQuery.data?.email || !!profileQuery.data?.isTwoFactorEnabled

  // Профиль вместе с журналом (он под тем же ключом).
  const refresh = () => queryClient.invalidateQueries({ queryKey: profileQueryKey })

  return (
    <ProfileSectionScreen title='Безопасность' onRefresh={refresh}>
      <QueryState query={profileQuery} errorTitle='Не удалось загрузить профиль'>
        {profile => (
          <View className='gap-8'>
            <View className='gap-4'>
              <Heading level={5}>Пароль</Heading>
              <Input
                value=''
                placeholder={profile.hasPassword ? '••••••' : 'Пароль не установлен'}
                editable={false}
                accessibilityLabel={profile.hasPassword ? 'Пароль установлен' : 'Пароль не установлен'}
                trailing={
                  <InputAction
                    title={profile.hasPassword ? 'Сменить пароль' : 'Установить пароль'}
                    onPress={() => router.push('/change-password')}
                  />
                }
              />
            </View>

            <View className='gap-4'>
              <Heading level={5}>Двухфакторная аутентификация</Heading>
              <SettingsCard
                label='Двухфакторная аутентификация'
                description={
                  canToggleTwoFactor
                    ? 'Включите двухфакторную аутентификацию, чтобы защитить свой аккаунт'
                    : 'Сначала привяжите почту в разделе «Личные данные»: код подтверждения приходит на неё'
                }
                action={
                  <Switch
                    value={profile.isTwoFactorEnabled}
                    onValueChange={() => toggleTwoFactor()}
                    disabled={isTogglingTwoFactor || !canToggleTwoFactor}
                    accessibilityLabel='Двухфакторная аутентификация'
                  />
                }
              />
            </View>

            <View>
              <Heading level={5} className='mb-1'>
                Недавняя активность
              </Heading>
              <Text className='mb-4 text-sm text-gray-500'>
                Смена пароля, почты и телефона, вход с нового устройства. Если видите то, чего не делали, — смените
                пароль и напишите в поддержку.
              </Text>
              <SecurityEventsSection />
            </View>

            {/* Администратору самоудаление недоступно (UserService.deleteAccount). */}
            {profile.role !== 'ADMIN' && (
              <View className='gap-4'>
                <Heading level={5}>Удаление аккаунта</Heading>
                <SettingsCard
                  label='Удалить аккаунт'
                  description='Действие необратимо — все данные аккаунта будут обезличены'
                  action={
                    <Button
                      title='Удалить'
                      variant='destructive-soft'
                      size='sm'
                      onPress={() => router.push('/delete-account')}
                    />
                  }
                />
              </View>
            )}
          </View>
        )}
      </QueryState>
    </ProfileSectionScreen>
  )
}
