import type { Metadata } from 'next'

import { AboutContact, AboutFounder, AboutHero, AboutMission, AboutTrust } from '@/components/features/about/components'

import { buildPageMetadata } from '@/shared/utils/metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'О компании',
  description: 'AgroZone — площадка объявлений для агропромышленного рынка: сельхозтехника, продукция и услуги.',
  path: '/about'
})

export default function AboutPage() {
  return (
    <div>
      <AboutHero />
      <AboutMission />
      <AboutTrust />
      <AboutFounder />
      <AboutContact />
    </div>
  )
}
