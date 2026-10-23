import type { Metadata } from 'next'

import { SafetyContent } from '@/components/features/safety/components'

import { buildPageMetadata } from '@/shared/utils/metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Безопасность сделок',
  description:
    'Как безопасно покупать и продавать на AgroZone: проверка продавца и организации, осмотр техники, документы на семена и продукцию, оплата, признаки мошенничества и что делать, если вас обманули.',
  path: '/safety'
})

export default function SafetyPage() {
  return <SafetyContent />
}
