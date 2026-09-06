import { Heading } from '@/components/ui'

import { IAd } from '../types/ad.types'
import { AdCard } from './ad-card'

interface SimilarAdsSectionProps {
  ads: IAd[]
}

// Блок "Похожие объявления" на странице объявления — те же объявления
// категории (см. AdsService.findAll: query.excludeAdId), без карты и без
// доп. фильтров. У Avito такого блока на странице объявления нет (см.
// обсуждение в чате и ROADMAP.md), но у agro-zone заметная доля трафика
// приходит холодной/через шэренные ссылки прямо на страницу объявления, а
// не через каталог — этот блок даёт такому посетителю следующий шаг, вместо
// тупика. Если объявлений той же категории (кроме текущего) нет — секция
// просто не рендерится, никакого текста про "нет похожих" не показываем
// (см. ad-detail.tsx: ads.length ? <SimilarAdsSection ... /> : null).
//
// Раскладка — не сетка (в отличие от AdsGrid/CatalogAdsGrid): здесь
// горизонтальная лента с прокруткой на чистом CSS (overflow-x-auto +
// scroll-snap), тот же приём, что уже используется для миниатюр фото выше
// на этой же странице (см. galleryRef в ad-detail.tsx). Библиотека-карусель
// (Swiper и т.п.) сознательно не подключается — нативного скролла достаточно
// для простой прокрутки ~8 карточек, а автоплей/точки/infinite loop тут не
// нужны.
export function SimilarAdsSection({ ads }: SimilarAdsSectionProps) {
  return (
    <div>
      <Heading level={4} className='mb-3'>
        Похожие объявления
      </Heading>
      <div className='flex snap-x snap-mandatory gap-3 [scrollbar-width:none] overflow-x-auto overscroll-x-contain pb-1 [&::-webkit-scrollbar]:hidden sm:gap-4'>
        {ads.map(ad => (
          <div key={ad.id} className='w-36 flex-shrink-0 snap-start sm:w-48'>
            <AdCard ad={ad} />
          </div>
        ))}
      </div>
    </div>
  )
}
