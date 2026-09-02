'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui'
import { getAvatarColor } from '@/shared/utils'

// Специально не Pick<IUser, ...> — этот компонент используется в разных
// фичах (сообщения, объявления, админка), а там у "публичного" юзера
// каждый раз чуть свой тип (IMessageUser, IPendingAdUser, IAdReportUser...),
// обычно с displayName/picture в виде string | null, а не string | undefined
// как в самом IUser. Свой минимальный тип здесь избавляет от подгонки типов
// на каждом месте использования.
interface UserAvatarProps {
  user: {
    id: string
    displayName?: string | null
    picture?: string | null
  }
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

// Аватарка пользователя с фолбэком: если фото не загружено — показываем
// первую букву имени на цветном фоне. Цвет берётся детерминированно по
// user.id (см. getAvatarColor), чтобы у одного и того же пользователя он
// был одинаковым везде, где он отображается.
export const UserAvatar = ({ user, size, className }: UserAvatarProps) => {
  return (
    <Avatar size={size} className={className}>
      <AvatarImage src={user.picture ?? undefined} />
      <AvatarFallback style={{ backgroundColor: getAvatarColor(user.id) }}>
        {user.displayName?.slice(0, 1).toUpperCase() ?? '?'}
      </AvatarFallback>
    </Avatar>
  )
}
