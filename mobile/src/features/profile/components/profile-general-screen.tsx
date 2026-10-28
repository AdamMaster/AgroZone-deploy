import { useRouter } from 'expo-router'
import { View } from 'react-native'

import { useAdNavigation } from '@/features/ads/hooks/use-ad-navigation'
import { useProfile } from '@/features/auth/hooks/use-profile'
import { OwnSellerRating } from '@/features/sellers/components/own-seller-rating'

import { FormField } from '@/shared/components/form-field'
import { Input, InputAction } from '@/shared/components/input'
import { QueryState } from '@/shared/components/query-state'
import { formatPhoneInput } from '@/shared/utils/phone'

import { PresentationField } from './presentation-field'
import { ProfileAvatarPicker } from './profile-avatar-picker'
import { ProfileDetailsForm } from './profile-details-form'
import { ProfileSectionScreen } from './profile-section-screen'

// «Личные данные» — первый раздел вкладки «Профиль», как
// /profile/settings/general сайта.
export function ProfileGeneralScreen() {
  const router = useRouter()
  const profileQuery = useProfile()
  const { openSeller } = useAdNavigation()

  return (
    <ProfileSectionScreen title='Личные данные' onRefresh={profileQuery.refetch}>
      <QueryState query={profileQuery} errorTitle='Не удалось загрузить профиль'>
        {profile => (
          <View className='gap-6'>
            <ProfileAvatarPicker profile={profile} />

            <OwnSellerRating rating={profile.rating} showHint onPress={() => openSeller(profile.id, 'reviews')} />

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
      </QueryState>
    </ProfileSectionScreen>
  )
}
