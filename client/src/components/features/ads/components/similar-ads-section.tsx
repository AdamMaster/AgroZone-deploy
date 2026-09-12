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
      <div className='flex snap-x snap-mandatory [scrollbar-width:none] gap-x-6 gap-y-4 overflow-x-auto overscroll-x-contain pb-1 sm:gap-4 sm:gap-x-2.5 md:gap-x-2.5 xl:gap-x-6 [&::-webkit-scrollbar]:hidden'>
        {ads.map(ad => (
          <div key={ad.id} className='w-36 w-[196px] flex-shrink-0 snap-start lg:w-[238.5px] xl:w-[260.8px]'>
            <AdCard ad={ad} />
          </div>
        ))}
      </div>
    </div>
  )
}
