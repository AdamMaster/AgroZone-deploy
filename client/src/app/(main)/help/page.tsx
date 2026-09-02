import type { Metadata } from 'next'

import { StaticPagePlaceholder } from '@/components/layout'

export const metadata: Metadata = {
  title: 'Помощь | AgroZone'
}

export default function HelpPage() {
  return (
    <StaticPagePlaceholder
      title='Помощь'
      description='Мы готовим раздел с ответами на частые вопросы: как разместить объявление, как работают платные услуги продвижения и премиум, как связаться с поддержкой.'
    />
  )
}
