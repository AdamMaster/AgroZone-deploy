import { UserRole } from '@/components/features/auth/types'

import { formatFullDate, isPremiumActive } from '@/shared/utils'

interface UserBadgesProps {
  role: UserRole
  premiumUntil: string | null
  deletedAt: string | null
}

// Общие бейджи статуса пользователя (Админ/Premium/Удалён) для админки —
// переиспользуются и в строке результатов поиска (UsersSearch), и в шапке
// карточки пользователя (UserAdminDetail), чтобы не держать одну и ту же
// разметку/цвета в двух местах.
export const UserBadges = ({ role, premiumUntil, deletedAt }: UserBadgesProps) => {
  return (
    <>
      {role === UserRole.Admin && (
        <span className='rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] text-red-300'>Админ</span>
      )}
      {isPremiumActive(premiumUntil) && (
        <span className='rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-300'>Premium</span>
      )}
      {deletedAt && (
        <span className='rounded-full bg-mist-500/30 px-2 py-0.5 text-[11px] text-mist-300'>
          Удалён {formatFullDate(deletedAt)}
        </span>
      )}
    </>
  )
}
