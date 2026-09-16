'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { UserAvatar } from '@/components/features/user/components'
import { Button, ButtonBack } from '@/components/ui'

import { AD_STATUS_LABELS } from '@/shared/constants/ad-statuses'
import { USER_TYPE_LABELS } from '@/shared/constants/user-types'
import { formatFullDate, formatPhoneNumber, formatPriceWithUnit } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { useAdminUserAds } from '../../ads/hooks'
import { ADMIN_BUTTON_CLASS } from '../constants/admin-ui.constants'
import { useAdminUserDetail } from '../hooks'
import { DeleteAdAdminDialog } from './delete-ad-admin-dialog'
import { SetAdExpirationDialog } from './set-ad-expiration-dialog'
import { SetPremiumDialog } from './set-premium-dialog'
import { UserBadges } from './user-badges'

const AUTH_METHOD_LABELS: Record<string, string> = {
  CREDENTIALS: 'Телефон + пароль',
  GOOGLE: 'Google',
  YANDEX: 'Яндекс'
}

interface UserAdminDetailProps {
  id: string
}

// Полная карточка пользователя в админке (/admin/users/:id) — первый шаг
// из плана (см. обсуждение): пока read-only просмотр профиля/телефонов/
// связанных аккаунтов, плюс удаление конкретного объявления (см.
// DeleteAdAdminDialog); ручная выдача premium и бан добавятся следующими
// итерациями поверх этой же карточки.
export const UserAdminDetail = ({ id }: UserAdminDetailProps) => {
  const router = useRouter()
  const { user, isLoading, isError } = useAdminUserDetail(id)
  const { ads, total: totalAds, isFetchingNextPage, hasNextPage, fetchNextPage } = useAdminUserAds(id)

  if (isLoading) {
    return <p className='py-6 text-sm text-neutral-50'>Загрузка...</p>
  }

  if (isError || !user) {
    return (
      <div className='py-6 text-neutral-50'>
        <ButtonBack className='mb-4 bg-neutral-700 hover:bg-neutral-600' onClick={() => router.push('/admin/users')} />
        <p className='text-sm'>Пользователь не найден.</p>
      </div>
    )
  }

  const primaryPhone = user.phones.find(phone => phone.isPrimary)?.phone ?? user.phones[0]?.phone

  return (
    <div className='max-w-3xl py-6 text-neutral-50'>
      <ButtonBack className='mb-4 bg-neutral-700 hover:bg-neutral-600' onClick={() => router.push('/admin/users')} />

      <div className='mb-6 flex items-start gap-4'>
        <UserAvatar user={user} size='lg' />

        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-xl font-semibold'>{user.displayName || 'Без имени'}</h1>
            <UserBadges role={user.role} premiumUntil={user.premiumUntil} deletedAt={user.deletedAt} />
          </div>
          <p className='mt-1 text-sm text-neutral-300'>
            {USER_TYPE_LABELS[user.type]} · с нами с {formatFullDate(user.createdAt)}
          </p>
        </div>
      </div>

      <div className='mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <div className='bg-neutral-600/50 p-3'>
          <p className='text-xs text-neutral-400'>Телефоны</p>
          {user.phones.length === 0 ? (
            <p className='text-sm'>—</p>
          ) : (
            <div className='flex flex-col gap-0.5'>
              {user.phones.map(phone => (
                <p key={phone.id} className='text-sm'>
                  {formatPhoneNumber(phone.phone)}
                  {phone.isPrimary && <span className='ml-1.5 text-xs text-neutral-400'>основной</span>}
                  {!phone.isVerified && <span className='ml-1.5 text-xs text-amber-400'>не подтверждён</span>}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className='bg-neutral-600/50 p-3'>
          <p className='text-xs text-neutral-400'>Email</p>
          <p className='text-sm'>{user.email ?? '—'}</p>
        </div>

        <div className='bg-neutral-600/50 p-3'>
          <p className='text-xs text-neutral-400'>Вход</p>
          <p className='text-sm'>
            {primaryPhone ? 'По телефону (звонок)' : 'Только через OAuth'}
            {user.hasPassword ? ', пароль установлен' : ''}
          </p>
          {user.accounts.length > 0 && (
            <p className='mt-1 text-sm text-neutral-300'>
              Также:{' '}
              {user.accounts
                .map(account => AUTH_METHOD_LABELS[account.provider.toUpperCase()] ?? account.provider)
                .join(', ')}
            </p>
          )}
        </div>

        <div className='bg-neutral-600/50 p-3'>
          <p className='text-xs text-neutral-400'>Premium до</p>
          <div className='mt-0.5 flex items-center justify-between gap-2'>
            <p className='text-sm'>{user.premiumUntil ? formatFullDate(user.premiumUntil) : 'Не активен'}</p>
            <SetPremiumDialog userId={id} premiumUntil={user.premiumUntil} />
          </div>
        </div>

        {user.businessVerifiedAt && (
          <div className='bg-neutral-600/50 p-3 sm:col-span-2'>
            <p className='text-xs text-neutral-400'>Бизнес подтверждён (ИНН {user.businessInn})</p>
            <p className='text-sm'>{user.businessName}</p>
          </div>
        )}
      </div>

      <h2 className='mb-3 text-lg font-semibold'>Объявления {totalAds > 0 && `(${totalAds})`}</h2>

      {ads.length === 0 && <p className='text-sm text-neutral-300'>Объявлений нет.</p>}

      <div className='flex flex-col gap-2'>
        {ads.map(ad => (
          <div key={ad.id} className='flex items-center gap-3 bg-neutral-600/50 p-3 hover:bg-neutral-600/70'>
            <Link href={`/ads/${ad.id}`} target='_blank' className='flex min-w-0 flex-1 items-center gap-3'>
              <div className='relative size-14 shrink-0 overflow-hidden rounded-sm bg-neutral-700'>
                {ad.images[0] && <Image src={ad.images[0]} alt={ad.title} fill className='object-cover' sizes='56px' />}
              </div>

              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='truncate font-medium'>{ad.title}</span>
                  <span className='rounded-full bg-neutral-500/30 px-2 py-0.5 text-[11px] text-neutral-200'>
                    {AD_STATUS_LABELS[ad.status] ?? ad.status}
                  </span>
                </div>
                <p className='text-sm text-neutral-300'>
                  {formatPriceWithUnit(ad.price, ad.unit)} · {formatFullDate(ad.createdAt)}
                </p>
                {ad.status === 'REJECTED' && ad.rejectionReason && (
                  <p className='mt-0.5 text-xs text-red-400'>{ad.rejectionReason}</p>
                )}
              </div>
            </Link>

            <div className='flex shrink-0 gap-1'>
              <SetAdExpirationDialog adId={ad.id} userId={id} expiresAt={ad.expiresAt} />
              <DeleteAdAdminDialog adId={ad.id} adTitle={ad.title} userId={id} />
            </div>
          </div>
        ))}
      </div>

      {hasNextPage && (
        <div className='mt-4 flex justify-center'>
          <Button
            type='button'
            size='sm'
            className={cn(ADMIN_BUTTON_CLASS)}
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? 'Загружаем...' : 'Показать ещё'}
          </Button>
        </div>
      )}
    </div>
  )
}
