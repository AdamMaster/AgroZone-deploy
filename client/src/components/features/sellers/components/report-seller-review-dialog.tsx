'use client'

import { SELLER_REVIEW_REPORT_REASON_OPTIONS } from '@/shared/constants/seller-review-report-reasons'

import { SELLER_REVIEW_REPORT_COMMENT_MAX_LENGTH } from '../constants/seller-reviews.constants'
import { useReportSellerReview } from '../hooks'
import { SellerReviewReportReason } from '../types'
import { ReasonReportDialog } from './reason-report-dialog'

interface ReportSellerReviewDialogProps {
  reviewId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ReportSellerReviewDialog = ({ reviewId, open, onOpenChange }: ReportSellerReviewDialogProps) => {
  const { reportReview, isReporting } = useReportSellerReview()

  return (
    <ReasonReportDialog<SellerReviewReportReason>
      title='Пожаловаться на отзыв'
      description='Расскажите, что не так с отзывом — модератор его проверит.'
      options={SELLER_REVIEW_REPORT_REASON_OPTIONS}
      open={open}
      onOpenChange={onOpenChange}
      isPending={isReporting}
      commentMaxLength={SELLER_REVIEW_REPORT_COMMENT_MAX_LENGTH}
      onSubmit={(dto, onSuccess) => reportReview({ id: reviewId, dto }, { onSuccess })}
    />
  )
}
