import { useState } from 'react'
import { Pressable, Text } from 'react-native'

import { useIsSignedIn } from '@/features/auth/hooks/use-is-signed-in'
import { useProfile } from '@/features/auth/hooks/use-profile'
import { useRequestSignIn } from '@/features/auth/hooks/use-request-sign-in'
import { useSiteFlags } from '@/features/site-settings/hooks/use-site-flags'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Flag } from '@/shared/icons/lucide'

import { ReportSellerDialog } from './report-seller-dialog'

// «Пожаловаться на продавца» (мошенничество) на странице продавца — как
// SellerActions сайта: только при включённых рейтингах и не себе. Гостя ведём
// на вход; сервер дополнительно требует, чтобы жалующийся связывался с
// продавцом.
export function SellerActions({ sellerId }: { sellerId: string }) {
  const { sellerRatings } = useSiteFlags()
  const isSignedIn = useIsSignedIn()
  const { data: profile } = useProfile()
  const requestSignIn = useRequestSignIn()
  const iconColor = useThemeColor('--color-gray-500')
  const [isOpen, setIsOpen] = useState(false)

  if (!sellerRatings || profile?.id === sellerId) return null

  return (
    <>
      <Pressable
        accessibilityRole='button'
        onPress={() => (isSignedIn ? setIsOpen(true) : requestSignIn())}
        hitSlop={6}
        className='flex-row items-center gap-1.5 self-start active:opacity-70'
      >
        <Flag size={16} color={iconColor} />
        <Text className='text-sm text-gray-500'>Пожаловаться на продавца</Text>
      </Pressable>
      {isSignedIn && <ReportSellerDialog sellerId={sellerId} visible={isOpen} onClose={() => setIsOpen(false)} />}
    </>
  )
}
