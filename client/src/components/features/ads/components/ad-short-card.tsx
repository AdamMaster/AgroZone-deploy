'use client'

import { CircleAlert, Edit, Ellipsis, ImageIcon } from 'lucide-react'
import { Crown } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, ReactNode, useState } from 'react'

import { Button, Heading, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { useProfile } from '@/shared/hooks'
import { formatPriceWithUnit } from '@/shared/utils'

import { IAd } from '../../ads/types/ad.types'
import { AD_BADGE_LABELS } from '../constants/ad-services.constants'
import { useActivateAd, useDraftAd, useRemoveAd, useRepublishAd } from '../hooks'
import { useArchiveAd } from '../hooks/use-archive-ad'
import { AdRemoveConfirmDialog } from './ad-remove-confirm-dialog'

// Один и тот же вид кнопки «Ещё» для всех статусов объявления.
const MENU_TRIGGER_CLASS_NAME =
  'bg-background! hover:bg-muted! hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-input/50 flex w-10 items-center justify-center rounded-md border! dark:border-none dark:bg-neutral-50! dark:text-neutral-900!'

interface AdMenuAction {
  key: string
  label: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}

const formatBumpDate = (value: Date | string) => {
  const date = new Date(value)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) {
    return `сегодня в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (date.toDateString() === yesterday.toDateString()) {
    return 'вчера'
  }

  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date)
}

const formatServiceUntilDate = (value: Date | string) => {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(value))
}

export const AdShortCard = ({ ad }: { ad: IAd }) => {
  const router = useRouter()
  const { user } = useProfile()
  const { removeAd, isLoadingRemove } = useRemoveAd()
  const { archiveAd, isLoadingArchive } = useArchiveAd()
  const { activateAd, isLoadingActivate } = useActivateAd()
  const { draftAd, isLoadingDraft } = useDraftAd()
  const { republishAd, isLoadingRepublishAd } = useRepublishAd()
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)

  const isOwnerPremiumActive = !!user?.premiumUntil && new Date(user.premiumUntil) > new Date()
  const isBumpServiceActive = !!ad.bumpServiceUntil && new Date(ad.bumpServiceUntil) > new Date()
  const isPriceHighlightActive = !!ad.priceHighlightUntil && new Date(ad.priceHighlightUntil) > new Date()
  const isBadgeActive = !!ad.badgeUntil && new Date(ad.badgeUntil) > new Date()

  const handleEdit = () => {
    router.push(`/ads/${ad.id}/edit`)
  }

  const handleRemove = () => {
    setIsRemoveDialogOpen(true)
  }

  const handleConfirmRemove = () => {
    removeAd(ad.id, {
      onSuccess: () => {
        setIsRemoveDialogOpen(false)
        router.push('/profile/settings/ads')
      }
    })
  }

  const handleArchive = () => {
    archiveAd(ad.id)
  }

  const handleDraft = () => {
    draftAd(ad.id)
  }

  const handlePublished = () => {
    activateAd(ad.id)
  }

  const handleRepublish = () => {
    republishAd({ id: ad.id })
  }

  const detailHref = ad.status === 'PUBLISHED' ? `/ads/${ad.id}` : `/ads/${ad.id}/edit`

  const removeAction: AdMenuAction = {
    key: 'remove',
    label: 'Удалить',
    onClick: handleRemove,
    disabled: isLoadingRemove,
    destructive: true
  }

  // Пункты меню «Ещё» по статусам. Статусы, которых здесь нет, остаются без
  // меню.
  const menuActionsByStatus: Partial<Record<IAd['status'], AdMenuAction[]>> = {
    PUBLISHED: [{ key: 'archive', label: 'Снять с публикации', onClick: handleArchive }, removeAction],
    PENDING: [
      { key: 'archive', label: 'Уже не актуально', onClick: handleArchive, disabled: isLoadingArchive },
      removeAction
    ],
    REJECTED: [{ key: 'draft', label: 'В черновик', onClick: handleDraft, disabled: isLoadingDraft }, removeAction],
    ARCHIVED: [removeAction],
    DRAFT: [removeAction],
    EXPIRED: [removeAction]
  }

  const menuActions = menuActionsByStatus[ad.status]

  const statusItems: { key: string; content: ReactNode }[] = []

  if (isOwnerPremiumActive) {
    statusItems.push({
      key: 'premium',
      content: (
        <Tooltip>
          <TooltipTrigger className='flex items-center gap-1 text-[11px] font-medium text-orange-600'>
            <Crown className='size-3' />
            Поднятие и выделение цены уже включены премиумом
          </TooltipTrigger>
          <TooltipContent>
            Премиум-аккаунт сам поднимает все ваши объявления в топ каждый день и выделяет цену — эти услуги можно не
            покупать, только значок премиум не заменяет.
          </TooltipContent>
        </Tooltip>
      )
    })
  }

  if (isBumpServiceActive) {
    statusItems.push({
      key: 'bump',
      content: (
        <p className='text-[11px] text-gray-500'>
          Поднятие активно до {formatServiceUntilDate(ad.bumpServiceUntil as Date | string)}
        </p>
      )
    })
  }

  if (ad.bumpedAt) {
    statusItems.push({
      key: 'bumped-at',
      content: <p className='text-[11px] text-gray-500'>Поднято {formatBumpDate(ad.bumpedAt)}</p>
    })
  }

  if (isPriceHighlightActive) {
    statusItems.push({
      key: 'price-highlight',
      content: (
        <p className='text-[11px] text-gray-500'>
          Цена выделена до {formatServiceUntilDate(ad.priceHighlightUntil as Date | string)}
        </p>
      )
    })
  }

  if (isBadgeActive && ad.badge) {
    statusItems.push({
      key: 'badge',
      content: (
        <p className='text-[11px] text-gray-500'>
          Значок «{AD_BADGE_LABELS[ad.badge]}» до {formatServiceUntilDate(ad.badgeUntil as Date | string)}
        </p>
      )
    })
  }

  return (
    <div className='w-full'>
      <div className='flex flex-col gap-4 md:flex-row'>
        <div className='flex w-full gap-2.5 sm:gap-4'>
          <Link
            href={detailHref}
            className='relative flex h-20 w-22 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 sm:h-24 sm:w-32 md:h-30 md:w-40'
          >
            {ad.images.length ? (
              <Image
                src={ad.images[0]}
                alt={ad.title}
                className='h-full w-full object-cover'
                fill
                sizes='(min-width: 768px) 160px, 128px'
              />
            ) : (
              <ImageIcon className='size-8 text-gray-400' />
            )}
          </Link>

          <div className='flex w-full max-w-90 flex-grow flex-col sm:flex'>
            <div className='mb-0 flex flex-col gap-0 sm:mb-1'>
              <div className='flex items-center gap-2'>
                <Heading level={4} className='leading-tight font-normal sm:text-lg sm:font-bold'>
                  <Link href={detailHref} className='hover:text-primary'>
                    {ad.title}
                  </Link>
                </Heading>
                {ad.status === 'REJECTED' && (
                  <Tooltip>
                    <TooltipTrigger>
                      <CircleAlert className='size-4 cursor-pointer text-amber-500' />
                    </TooltipTrigger>
                    <TooltipContent className='line-clamp-2'>{ad.rejectionReason}</TooltipContent>
                  </Tooltip>
                )}
              </div>
              {ad.status === 'PENDING' && (
                <Tooltip>
                  <TooltipTrigger className='-order-1'>
                    <span className='mb-1 flex w-fit items-center rounded-2xl bg-orange-200 px-2 py-0.5 text-xs dark:text-neutral-900'>
                      На модерации
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Мы проверяем объявление на соответствие правилам площадки. Обычно модерация занимает около 15 минут,
                    но в отдельных случаях может занять до 24 часов.
                  </TooltipContent>
                </Tooltip>
              )}
              {ad.status === 'EXPIRED' && (
                <span className='flex w-fit items-center rounded-2xl bg-orange-200 px-2 py-0.5 text-xs'>
                  Срок действия истек
                </span>
              )}
            </div>
            <p className='mb-0 text-base font-bold sm:mb-3 sm:text-lg'>{formatPriceWithUnit(ad.price, ad.unit)}</p>
            <p className='text-[13px] text-gray-500'>{ad.address}</p>
          </div>

          <button
            type='button'
            onClick={() => handleEdit()}
            aria-label={ad.status === 'REJECTED' ? 'Исправить' : 'Редактировать'}
            className='flex shrink-0 rounded-lg sm:hidden'
          >
            <Edit className='size-5 text-gray-950' />
          </button>
        </div>

        <div className='hidden w-full flex-col gap-2 sm:flex md:w-48'>
          {ad.status === 'DRAFT' ||
            (ad.status === 'ARCHIVED' && (
              <Button variant='outline' onClick={() => handlePublished()} disabled={isLoadingActivate}>
                Опубликовать
              </Button>
            ))}
          {ad.status === 'PUBLISHED' && (
            <div>
              <Button
                className='w-full'
                variant='outline'
                nativeButton={false}
                render={<Link href={`/ads/${ad.id}/promote`} />}
              >
                Поднять просмотры
              </Button>
            </div>
          )}
          {ad.status === 'DRAFT' && (
            <Button variant='outline' onClick={() => handlePublished()} disabled={isLoadingActivate}>
              Опубликовать
            </Button>
          )}
          {ad.status === 'EXPIRED' && (
            <Button variant='outline' onClick={() => handleRepublish()} disabled={isLoadingRepublishAd}>
              Опубликовать снова
            </Button>
          )}
          <div className='flex gap-1'>
            <Button className='grow' variant='outline' onClick={() => handleEdit()}>
              {ad.status === 'REJECTED' ? 'Исправить' : 'Редактировать'}
            </Button>
            {menuActions && (
              <DropdownMenu>
                <DropdownMenuTrigger aria-label='Ещё' className={MENU_TRIGGER_CLASS_NAME}>
                  <Ellipsis className='size-5' />
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-40' align='end'>
                  {menuActions.map(action => (
                    <DropdownMenuItem
                      key={action.key}
                      className={action.destructive ? 'text-red-500 hover:text-red-500!' : undefined}
                      disabled={action.disabled}
                      onClick={action.onClick}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
      {statusItems.length > 0 && (
        <div className='mt-2 flex flex-wrap items-center gap-x-2 gap-y-1'>
          {statusItems.map((item, index) => (
            <Fragment key={item.key}>
              {index > 0 && (
                <span className='text-gray-400' aria-hidden='true'>
                  -
                </span>
              )}
              {item.content}
            </Fragment>
          ))}
        </div>
      )}

      <AdRemoveConfirmDialog
        open={isRemoveDialogOpen}
        onOpenChange={setIsRemoveDialogOpen}
        adTitle={ad.title}
        isLoading={isLoadingRemove}
        onConfirm={handleConfirmRemove}
      />
    </div>
  )
}
