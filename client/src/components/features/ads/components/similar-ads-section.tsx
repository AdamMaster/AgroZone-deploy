import { Heading } from '@/components/ui'

import { IAd } from '../types/ad.types'
import { AdCard } from './ad-card'

interface SimilarAdsSectionProps {
  ads: IAd[]
}

export function SimilarAdsSection({ ads }: SimilarAdsSectionProps) {
  return (
    <div>
      <Heading level={3} className='mb-3'>
        Похожие объявления
      </Heading>
      <div className='flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto overscroll-x-contain pb-1 sm:gap-4 [&::-webkit-scrollbar]:hidden'>
        {ads.map(ad => (
          <div key={ad.id} className='w-36 flex-shrink-0 snap-start sm:w-[260.8px]'>
            <AdCard ad={ad} />
          </div>
        ))}
      </div>
    </div>
  )
}
