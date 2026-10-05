import { Headset } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui'

// Аватарка «Поддержки AgroZone» вместо буквы на цветном фоне — для шапок чата
// (см. ChatHeader, проп avatar).
export const SupportAvatar = () => (
  <Avatar>
    <AvatarFallback className='bg-primary text-white'>
      <Headset className='size-5' />
    </AvatarFallback>
  </Avatar>
)
