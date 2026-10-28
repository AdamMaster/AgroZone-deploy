'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button, ButtonBack, Heading, Loading } from '@/components/ui'
import { Textarea } from '@/components/ui/textarea'

import { AD_STATUS_LABELS } from '@/shared/constants/ad-statuses'
import { SELLER_REPORT_REASON_LABELS } from '@/shared/constants/seller-report-reasons'
import { formatPhoneNumber } from '@/shared/utils'

import { ADMIN_BUTTON_CLASS } from '../constants/admin-ui.constants'
import {
  SELLER_REPORT_STATUS_LABELS,
  SELLER_REVIEW_SIGNAL_LABELS,
  SELLER_SANCTION_TYPE_LABELS
} from '../constants/seller-review-moderation.constants'
import { useAdminSellerReportCard, useResolveSellerReports, useRollbackSellerReviews } from '../hooks'
import { SellerReportResolutionAction, SellerReportStatus } from '../types/admin.types'
import { SellerModerationConfirmDialog } from './seller-moderation-confirm-dialog'

const NOTE_MAX_LENGTH = 500

const formatDate = (iso: string) => new Date(iso).toLocaleString('ru-RU')

const SectionTitle = ({ children }: { children: string }) => (
  <Heading level={4} className='mb-2 text-base text-mist-50'>
    {children}
  </Heading>
)

interface SellerReportDetailProps {
  sellerId: string
}

export const SellerReportDetail = ({ sellerId }: SellerReportDetailProps) => {
  const router = useRouter()
  const { card, isLoading, isError } = useAdminSellerReportCard(sellerId)
  const { resolveSellerReports, isResolving } = useResolveSellerReports(sellerId)
  const { rollbackSellerReviews, isRollingBack } = useRollbackSellerReviews(sellerId)
  const [note, setNote] = useState('')

  if (isLoading) return <Loading />

  if (isError || !card) {
    return <p className='py-6 text-sm text-mist-50'>Не удалось загрузить продавца.</p>
  }

  const { seller, ads, reports, sanctions, reviewSignals } = card
  const pendingReports = reports.filter(report => report.status === SellerReportStatus.Pending)
  const trimmedNote = note.trim() || undefined
  const isBusy = isResolving || isRollingBack

  const resolve = (action: SellerReportResolutionAction) => {
    resolveSellerReports({ action, note: trimmedNote }, { onSuccess: () => setNote('') })
  }

  return (
    <div className='flex max-w-3xl flex-col gap-6 py-6 text-mist-50'>
      <div>
        <ButtonBack onClick={() => router.push('/admin/seller-reports')} />
        <Heading level={3} className='mt-2 text-mist-50'>
          {seller.deletedAt ? 'Удалённый аккаунт' : (seller.displayName ?? 'Продавец')}
        </Heading>
        <p className='text-sm text-mist-300'>
          {seller.email ?? 'Без email'}
          {seller.phones.map(({ phone }) => ` · ${formatPhoneNumber(phone)}`)}
        </p>
        <p className='text-xs text-mist-400'>
          На площадке с {formatDate(seller.createdAt)}
          {seller.businessVerifiedAt && ' · Компания проверена'}
          {' · '}
          <Link href={`/admin/users/${seller.id}`} className='hover:text-primary underline-offset-2 hover:underline'>
            Карточка пользователя
          </Link>
        </p>
      </div>

      <section>
        <SectionTitle>Объявления</SectionTitle>
        {Object.keys(ads).length === 0 ? (
          <p className='text-sm text-mist-300'>Объявлений нет.</p>
        ) : (
          <p className='text-sm'>
            {Object.entries(ads)
              .map(([status, count]) => `${AD_STATUS_LABELS[status] ?? status}: ${count}`)
              .join(' · ')}
          </p>
        )}
      </section>

      <section>
        <SectionTitle>Жалобы</SectionTitle>
        <div className='flex flex-col gap-2'>
          {reports.map(report => (
            <div key={report.id} className='rounded-md bg-mist-600/50 p-3 text-sm'>
              <div className='mb-1 flex flex-wrap items-center gap-2'>
                <span className='font-medium text-red-400'>{SELLER_REPORT_REASON_LABELS[report.reason]}</span>
                <span className='rounded-full bg-amber-200 px-1.5 text-[11px] text-mist-950'>
                  {SELLER_REPORT_STATUS_LABELS[report.status]}
                </span>
              </div>
              {report.comment && <p className='rounded-sm bg-mist-600/60 p-2'>{report.comment}</p>}
              <p className='mt-2 text-xs text-mist-400'>
                <Link
                  href={`/admin/users/${report.reporter.id}`}
                  className='hover:text-primary underline-offset-2 hover:underline'
                >
                  {report.reporter.displayName ?? 'Пользователь'}
                </Link>{' '}
                (на площадке с {formatDate(report.reporter.createdAt)}) · {formatDate(report.createdAt)}
                {report.ad && (
                  <>
                    {' · '}
                    <Link
                      href={`/ads/${report.ad.id}`}
                      target='_blank'
                      className='hover:text-primary underline-offset-2 hover:underline'
                    >
                      {report.ad.title}
                    </Link>
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Отзывы и признаки накрутки</SectionTitle>
        <p className='mb-2 text-sm text-mist-300'>
          Отзывов (без скрытых): {reviewSignals.totalReviews}. Сигналы только подсвечивают закономерности, решение
          принимает модератор.
        </p>
        {reviewSignals.flagged.length === 0 ? (
          <p className='text-sm'>Подозрительных закономерностей не найдено.</p>
        ) : (
          <ul className='list-disc pl-5 text-sm text-amber-200'>
            {reviewSignals.flagged.map(code => (
              <li key={code}>{SELLER_REVIEW_SIGNAL_LABELS[code]}</li>
            ))}
          </ul>
        )}
        {reviewSignals.totalReviews > 0 && (
          <div className='mt-3'>
            <SellerModerationConfirmDialog
              triggerLabel='Скрыть все отзывы о продавце'
              title='Скрыть все отзывы?'
              description='Все отзывы об этом продавце будут скрыты, его рейтинг обнулится. Используйте, если накрутка подтверждена. Вернуть отзывы можно по одному в разделе «Отзывы».'
              confirmLabel='Скрыть все отзывы'
              isPending={isBusy}
              onConfirm={() => rollbackSellerReviews({ note: trimmedNote })}
            />
          </div>
        )}
      </section>

      <section>
        <SectionTitle>История мер</SectionTitle>
        {sanctions.length === 0 ? (
          <p className='text-sm text-mist-300'>Мер по этому продавцу ещё не было.</p>
        ) : (
          <ul className='flex flex-col gap-1 text-sm'>
            {sanctions.map(sanction => (
              <li key={sanction.id}>
                <span className='font-medium'>{SELLER_SANCTION_TYPE_LABELS[sanction.type]}</span>
                <span className='text-mist-400'>
                  {' · '}
                  {formatDate(sanction.createdAt)}
                  {' · '}
                  {sanction.moderator ? (sanction.moderator.displayName ?? 'Модератор') : 'автоматически'}
                </span>
                {sanction.note && <span className='block text-mist-300'>{sanction.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {pendingReports.length > 0 && (
        <section>
          <SectionTitle>Решение по жалобам</SectionTitle>
          <p className='mb-2 text-sm text-mist-300'>
            Решение закрывает все нерассмотренные жалобы ({pendingReports.length}). Блокировка аккаунта здесь
            недоступна. Заметку продавцу не видно.
          </p>
          <Textarea
            value={note}
            maxLength={NOTE_MAX_LENGTH}
            placeholder='Заметка для истории мер (необязательно)'
            className='mb-3'
            onChange={event => setNote(event.target.value)}
          />
          <div className='flex flex-wrap gap-2'>
            <Button
              size='sm'
              className={ADMIN_BUTTON_CLASS}
              disabled={isBusy}
              onClick={() => resolve(SellerReportResolutionAction.Dismiss)}
            >
              Жалобы необоснованны
            </Button>
            <Button
              size='sm'
              className={ADMIN_BUTTON_CLASS}
              disabled={isBusy}
              onClick={() => resolve(SellerReportResolutionAction.Warn)}
            >
              Предупредить продавца
            </Button>
            <SellerModerationConfirmDialog
              triggerLabel='Приостановить объявления'
              title='Приостановить объявления?'
              description='Опубликованные объявления продавца будут скрыты от покупателей, а сам продавец не сможет их изменить или удалить. Продавец получит уведомление.'
              confirmLabel='Приостановить'
              isPending={isBusy}
              onConfirm={() => resolve(SellerReportResolutionAction.SuspendAds)}
            />
          </div>
        </section>
      )}
    </div>
  )
}
