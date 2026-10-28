import {
  SELLER_REPORT_COMMENT_MAX_LENGTH,
  SELLER_REVIEW_REPORT_REASON_OPTIONS
} from '../constants/seller-reviews.constants'
import { useReportSellerReview } from '../hooks/use-seller-review-actions'
import type { SellerReviewReportReason } from '../types/seller-review.types'
import { ReasonReportDialog } from './reason-report-dialog'

interface ReportSellerReviewDialogProps {
  reviewId: string
  visible: boolean
  onClose: () => void
}

export function ReportSellerReviewDialog({ reviewId, visible, onClose }: ReportSellerReviewDialogProps) {
  const report = useReportSellerReview()

  return (
    <ReasonReportDialog<SellerReviewReportReason>
      visible={visible}
      onClose={onClose}
      title='Пожаловаться на отзыв'
      description='Расскажите, что не так с отзывом — модератор его проверит.'
      options={SELLER_REVIEW_REPORT_REASON_OPTIONS}
      commentMaxLength={SELLER_REPORT_COMMENT_MAX_LENGTH}
      isPending={report.isPending}
      onSubmit={(values, onSuccess) => report.mutate({ id: reviewId, ...values }, { onSuccess })}
    />
  )
}
