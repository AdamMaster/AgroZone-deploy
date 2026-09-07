import { DealerFeedStatus } from '../types/dealer-feed.types'

const STATUS_LABELS: Record<DealerFeedStatus, string> = {
  PENDING_REVIEW: 'На проверке',
  APPROVED: 'Одобрен',
  REJECTED: 'Отклонён'
}

const STATUS_COLORS: Record<DealerFeedStatus, string> = {
  PENDING_REVIEW: 'bg-orange-200',
  APPROVED: 'bg-green-200',
  REJECTED: 'bg-red-200'
}

export const DealerFeedStatusBadge = ({ status }: { status: DealerFeedStatus }) => {
  return (
    <span className={`flex w-fit items-center rounded-2xl px-2 py-0.5 text-xs ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
