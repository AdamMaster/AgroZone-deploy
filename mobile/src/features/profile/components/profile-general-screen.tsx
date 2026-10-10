import { useRouter } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'

import { useProfile } from '@/features/auth/hooks/use-profile'

import { FormField } from '@/shared/components/form-field'
import { Input, InputAction } from '@/shared/components/input'
import { ScreenMessage } from '@/shared/components/screen-message'
import { formatPhoneInput } from '@/shared/utils/phone'

import { PresentationField } from './presentation-field'
import { ProfileAvatarPicker } from './profile-avatar-picker'
import { ProfileDetailsForm } from './profile-details-form'
import { ProfileSectionScreen } from './profile-section-screen'

// «Личные данные» — первый раздел вкладки «Профиль», как
// /profile/settings/general сайта.
export function ProfileGeneralScreen() {
  const router = useRouter()
  const { data: profile, error, isPending, refetch } = useProfile()

  return (
    <ProfileSectionScreen title='Личные данные' onRefresh={refetch}>
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
        <View className='gap-6'>
          <ProfileAvatarPicker profile={profile} />

          <View className='mb-4'>
            <ProfileDetailsForm profile={profile} />
          </View>

          <FormField label='Почта'>
            <Input
              value={profile.email ?? ''}
              placeholder='Почта'
              editable={false}
              accessibilityLabel='Почта'
              trailing={
                <InputAction
                  title={profile.email ? 'Изменить' : 'Добавить почту'}
                  onPress={() => router.push('/change-email')}
                />
              }
            />
          </FormField>

          <FormField label='Номер телефона'>
            <Input
              value={profile.primaryPhone ? formatPhoneInput(profile.primaryPhone) : ''}
              placeholder='Номер телефона'
              editable={false}
              accessibilityLabel='Номер телефона'
              trailing={
                <InputAction
                  title={profile.primaryPhone ? 'Изменить' : 'Добавить телефон'}
                  onPress={() => router.push('/change-phone')}
                />
              }
            />
          </FormField>

          <PresentationField profile={profile} />
        </View>
      )}
    </ProfileSectionScreen>
  )
}
