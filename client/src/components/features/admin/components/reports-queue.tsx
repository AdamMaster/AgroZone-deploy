'use client'

import Link from 'next/link'

import { Button, Heading } from '@/components/ui'

import { AD_REPORT_REASON_LABELS } from '@/shared/constants/ad-report-reasons'

import { useAdminReports, useUpdateReportStatus } from '../hooks'
import { AdReportStatus } from '../types/admin.types'

const STATUS_LABELS: Record<AdReportStatus, string> = {
  [AdReportStatus.Pending]: 'Новая',
  [AdReportStatus.Reviewed]: 'Рассмотрена',
  [AdReportStatus.Dismissed]: 'Отклонена'
}

export const ReportsQueue = () => {
  const { reports, isLoading } = useAdminReports()
  const { updateReportStatus, isUpdating } = useUpdateReportStatus()

  return (
    <div className='py-6 text-neutral-50'>
      {isLoading && <p className='text-sm'>Загрузка...</p>}

      {!isLoading && reports.length === 0 && <p className='text-sm'>Жалоб пока нет.</p>}

      <div className='flex flex-col gap-2'>
        {reports.map(report => (
          <div key={report.id} className='flex items-start gap-4 bg-neutral-600/50 p-3'>
            <div className='min-w-0 flex-1'>
              <div className='mb-1 flex items-center gap-2'>
                <Link href={`/ads/${report.ad.id}`} target='_blank' className='hover:text-primary font-medium'>
                  {report.ad.title}
                </Link>
                <span className='rounded-full bg-amber-200 px-1.5 text-[11px] text-neutral-950'>
                  {STATUS_LABELS[report.status]}
                </span>
              </div>
              <p className='text-sm text-red-400'>{AD_REPORT_REASON_LABELS[report.reason]}</p>
              {report.comment && <p className='mt-1 rounded-sm bg-neutral-600/60 p-2 text-sm'>{report.comment}</p>}
              <p className='mt-4 text-xs text-neutral-400'>От: {report.user.displayName ?? 'Пользователь'}</p>
            </div>

            {report.status === AdReportStatus.Pending && (
              <div className='flex shrink-0 gap-1'>
                <Button
                  size='sm'
                  className='rounded-sm bg-neutral-100 text-neutral-950 hover:bg-neutral-200'
                  disabled={isUpdating}
                  onClick={() => updateReportStatus({ id: report.id, status: AdReportStatus.Reviewed })}
                >
                  Рассмотрено
                </Button>
                <Button
                  size='sm'
                  className='rounded-sm bg-neutral-100 text-neutral-950 hover:bg-neutral-200'
                  disabled={isUpdating}
                  onClick={() => updateReportStatus({ id: report.id, status: AdReportStatus.Dismissed })}
                >
                  Отклонить
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
