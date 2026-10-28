import { SELLER_REPORT_COMMENT_MAX_LENGTH, SELLER_REPORT_REASON_OPTIONS } from '../constants/seller-reviews.constants'
import { useReportSeller } from '../hooks/use-seller-review-actions'
import type { SellerReportReason } from '../types/seller-review.types'
import { ReasonReportDialog } from './reason-report-dialog'

interface ReportSellerDialogProps {
  sellerId: string
  visible: boolean
  onClose: () => void
}

// Жалоба на мошенничество. Принимается только от тех, кто с продавцом
// связывался (писал ему или открывал телефон) — иначе сервер ответит отказом,
// и уведомление покажет его текст.
export function ReportSellerDialog({ sellerId, visible, onClose }: ReportSellerDialogProps) {
  const report = useReportSeller(sellerId)

  return (
    <ReasonReportDialog<SellerReportReason>
      visible={visible}
      onClose={onClose}
      title='Пожаловаться на продавца'
      description='Жалобу можно подать, если вы писали продавцу или открывали его телефон. Если вы потеряли деньги, обратитесь также в полицию.'
      options={SELLER_REPORT_REASON_OPTIONS}
      commentMaxLength={SELLER_REPORT_COMMENT_MAX_LENGTH}
      isPending={report.isPending}
      onSubmit={(values, onSuccess) => report.mutate(values, { onSuccess })}
    />
  )
}
