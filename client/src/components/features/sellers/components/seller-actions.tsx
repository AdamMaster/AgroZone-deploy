'use client'

import { useAppModal } from '@/store'
import { Flag } from 'lucide-react'
import { useState } from 'react'

import { useSiteFlags } from '@/components/features/site-settings/hooks'

import { useProfile } from '@/shared/hooks'

import { ReportSellerDialog } from './report-seller-dialog'

interface SellerActionsProps {
  sellerId: string
}

// Действия над продавцом на его странице. Сейчас одно — «Пожаловаться на
// продавца» (мошенничество): только при включённых рейтингах и не себе.
// Гостя ведём на вход; сервер дополнительно требует, чтобы жалующийся
// связывался с продавцом.
export const SellerActions = ({ sellerId }: SellerActionsProps) => {
  const { sellerRatings } = useSiteFlags()
  const { user } = useProfile()
  const { onOpen } = useAppModal()
  const [isOpen, setIsOpen] = useState(false)

  if (!sellerRatings || user?.id === sellerId) return null

  return (
    <>
      <button
        type='button'
        className='flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700'
        onClick={() => (user ? setIsOpen(true) : onOpen('login'))}
      >
        <Flag className='size-4' />
        Пожаловаться на продавца
      </button>
      {user && <ReportSellerDialog sellerId={sellerId} open={isOpen} onOpenChange={setIsOpen} />}
    </>
  )
}
