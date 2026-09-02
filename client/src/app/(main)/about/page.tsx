import type { Metadata } from 'next'

import { AboutContact, AboutFounder, AboutHero, AboutMission, AboutTrust } from '@/components/features/about/components'

export const metadata: Metadata = {
  title: 'О компании | AgroZone',
  description: 'AgroZone — площадка объявлений для агропромышленного рынка: сельхозтехника, продукция и услуги.'
}

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
