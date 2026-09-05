import type { Metadata } from 'next'

import { StaticPagePlaceholder } from '@/components/layout'

export const metadata: Metadata = {
  title: 'Безопасность'
}

export default function SafetyPage() {
  return (
    <StaticPagePlaceholder
      title='Безопасность'
      description='Здесь появятся рекомендации, как безопасно покупать и продавать на AgroZone: как проверять продавца, на что обращать внимание при оплате и личных встречах.'
    />
  )
}
