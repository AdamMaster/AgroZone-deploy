import { Text, View } from 'react-native'

import { AD_BADGE_LABELS, AD_BADGE_STYLES } from '../constants/ad-badges'
import type { AdBadge } from '../types/ad.types'

interface AdBadgeChipProps {
  badge: AdBadge
}

export function AdBadgeChip({ badge }: AdBadgeChipProps) {
  const styles = AD_BADGE_STYLES[badge]

  return (
    <View className={`rounded-2xl px-2.5 py-1 ${styles.container}`}>
      <Text className={`text-xs font-medium ${styles.text}`}>{AD_BADGE_LABELS[badge]}</Text>
    </View>
  )
}
