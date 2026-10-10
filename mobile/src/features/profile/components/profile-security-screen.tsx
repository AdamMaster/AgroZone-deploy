import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ActivityIndicator, Text, View } from 'react-native'

import { useProfile } from '@/features/auth/hooks/use-profile'
import { profileQueryKey } from '@/features/auth/store/auth-store'

import { Button } from '@/shared/components/button'
import { Heading } from '@/shared/components/heading'
import { Input, InputAction } from '@/shared/components/input'
import { ScreenMessage } from '@/shared/components/screen-message'
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
  const { data: profile, error, isPending, refetch } = useProfile()
  const { mutate: toggleTwoFactor, isPending: isTogglingTwoFactor } = useToggleTwoFactor()

  // Профиль вместе с журналом (он под тем же ключом).
  const refresh = () => queryClient.invalidateQueries({ queryKey: profileQueryKey })

  return (
    <ProfileSectionScreen title='Безопасность' onRefresh={refresh}>
      {isPending ? (
        <View className='items-center py-16'>
          <ActivityIndicator colorClassName='accent-primary' />
        </View>
      ) : !profile ? (
        <ScreenMessage
          title='Не удалось загрузить профиль'
          description={error?.message}
          action={{ title: 'Повторить', onPress: () => void refetch() }}
        />
      ) : (
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
            <Heading level={5}>Двух-факторная аутентификация</Heading>
            <SettingsCard
              label='Двухфакторная аутентификация'
              description='Включите двухфакторную аутентификацию, чтобы защитить свой аккаунт'
              action={
                <Switch
                  value={profile.isTwoFactorEnabled}
                  onValueChange={() => toggleTwoFactor()}
                  disabled={isTogglingTwoFactor}
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
              Смена пароля, почты и телефона, вход с нового устройства. Если видите то, чего не делали, — смените пароль
              и напишите в поддержку.
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
    </ProfileSectionScreen>
  )
}
