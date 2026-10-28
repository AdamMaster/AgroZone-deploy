'use client'

import Link from 'next/link'

import { Button } from '@/components/ui'

import { pluralizeRu } from '@/shared/utils'

import { ADMIN_BUTTON_CLASS } from '../constants/admin-ui.constants'
import { useAdminSellerReports } from '../hooks'

const formatDate = (iso: string) => new Date(iso).toLocaleString('ru-RU')

export const SellerReportsQueue = () => {
  const { items, total, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useAdminSellerReports()

  return (
    <div className='py-6 text-mist-50'>
      {isLoading && <p className='text-sm'>Загрузка...</p>}

      {!isLoading && items.length === 0 && <p className='text-sm'>Нечего проверять — жалоб на продавцов нет.</p>}

      {items.length > 0 && <p className='mb-3 text-sm text-mist-300'>Продавцов в очереди: {total}</p>}

      <div className='flex flex-col gap-2'>
        {items.map(item => {
          const seller = item.seller

          if (!seller) return null

          return (
            <div key={seller.id} className='flex items-start gap-4 rounded-md bg-mist-600/50 p-3'>
              <div className='min-w-0 flex-1'>
                <p className='font-medium'>
                  {seller.deletedAt ? 'Удалённый аккаунт' : (seller.displayName ?? seller.email ?? 'Пользователь')}
                </p>
                <p className='text-sm text-red-400'>
                  {item.pendingReports} {pluralizeRu(item.pendingReports, ['жалоба', 'жалобы', 'жалоб'])} ждут решения
                </p>
                {item.suspendedAds > 0 && (
                  <p className='text-sm text-amber-200'>Приостановлено объявлений: {item.suspendedAds}</p>
                )}
                <p className='mt-3 text-xs text-mist-400'>
                  Первая жалоба: {formatDate(item.oldestReportAt)} · На площадке с {formatDate(seller.createdAt)}
                </p>
              </div>

              <Button
                size='sm'
                className={ADMIN_BUTTON_CLASS}
                nativeButton={false}
                render={<Link href={`/admin/seller-reports/${seller.id}`} />}
              >
                Разобрать
              </Button>
            </div>
          )
        })}
      </div>

      {hasNextPage && (
        <Button className={`${ADMIN_BUTTON_CLASS} mt-4`} disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
          {isFetchingNextPage ? 'Загружаем...' : 'Показать ещё'}
        </Button>
      )}
    </div>
  )
}
