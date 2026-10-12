import { View } from 'react-native'

import { Avatar } from '@/shared/components/avatar'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { UserRound } from '@/shared/icons/lucide'

import type { SupportParticipant } from '../types/support.types'

interface SupportParticipantAvatarProps {
  participant: SupportParticipant
}

// Аватар участника обращения: у пользователя — его фото или буква, у гостя —
// серый кружок со значком, как в инбоксе сайта.
export function SupportParticipantAvatar({ participant }: SupportParticipantAvatarProps) {
  const iconColor = useThemeColor('--color-gray-500')

  if (participant.type === 'user') {
    return (
      <Avatar name={participant.displayName} pictureUrl={participant.picture} colorSeed={participant.id} size='base' />
    )
  }

  return (
    <View className='size-10 items-center justify-center rounded-full bg-gray-100'>
      <UserRound size={20} color={iconColor} />
    </View>
  )
}
