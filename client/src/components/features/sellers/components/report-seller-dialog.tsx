'use client'

import { SELLER_REPORT_REASON_OPTIONS } from '@/shared/constants/seller-report-reasons'

import { SELLER_REPORT_COMMENT_MAX_LENGTH } from '../constants/seller-reviews.constants'
import { useReportSeller } from '../hooks'
import { SellerReportReason } from '../types'
import { ReasonReportDialog } from './reason-report-dialog'

interface ReportSellerDialogProps {
  sellerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Жалоба на мошенничество. Принимается только от тех, кто с продавцом
// связывался (писал ему или открывал телефон) — иначе сервер ответит
// отказом, и тост покажет его текст.
export const ReportSellerDialog = ({ sellerId, open, onOpenChange }: ReportSellerDialogProps) => {
  const { reportSeller, isReporting } = useReportSeller(sellerId)

  return (
    <ReasonReportDialog<SellerReportReason>
      title='Пожаловаться на продавца'
      description='Жалобу можно подать, если вы писали продавцу или открывали его телефон. Если вы потеряли деньги, обратитесь также в полицию.'
      options={SELLER_REPORT_REASON_OPTIONS}
      open={open}
      onOpenChange={onOpenChange}
      isPending={isReporting}
      commentMaxLength={SELLER_REPORT_COMMENT_MAX_LENGTH}
      onSubmit={(dto, onSuccess) => reportSeller(dto, { onSuccess })}
    />
  )
}
