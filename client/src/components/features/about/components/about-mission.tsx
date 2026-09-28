import { Handshake, ShoppingBag, Wheat } from 'lucide-react'

import { Container } from '@/components/layout'

// v2 (см. обсуждение с пользователем — v1 с укороченным текстом и штрихом
// сверху всё ещё казался слишком плоским/скучным). Вместо чисто
// типографского центрированного блока — асимметричная вёрстка: текст
// слева, справа диаграмма "производит → AgroZone → нужно" на иконках.
// Так метафора "продавец и покупатель находят друг друга" (пользователь
// изначально хотел фото рукопожатия для Hero) выражена визуально, но без
// стокового фото и без риска кривых пальцев от генеративной картинки —
// значок Handshake ровно посередине буквально играет роль точки, где
// AgroZone сводит производителя и покупателя.
export const AboutMission = () => {
  return (
    <section className='bg-white py-24 dark:bg-background'>
      <Container>
        <div className='grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16'>
          <div className='text-center lg:text-left'>
            <span className='bg-primary/10 text-primary mb-5 inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase'>
              Наша миссия
            </span>

            <p className='text-3xl leading-tight font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-neutral-50'>
              Прямые сделки между тем, кто <span className='text-primary'>производит</span>, и тем, кому это{' '}
              <span className='text-primary'>нужно</span>.
            </p>

            <p className='mx-auto mt-5 max-w-md text-lg text-gray-500 lg:mx-0'>
              AgroZone существует, чтобы им было проще найти друг друга — без посредников и лишних звонков.
            </p>
          </div>

          <div className='flex items-center justify-center gap-1.5 sm:gap-3'>
            <div className='custom-shadow flex w-32 shrink-0 flex-col items-center gap-2.5 rounded-3xl bg-white p-4 text-center sm:w-40 sm:gap-3 sm:p-6 dark:bg-card'>
              <div className='bg-primary/10 text-primary flex size-11 items-center justify-center rounded-2xl sm:size-14'>
                <Wheat className='size-5 sm:size-7' />
              </div>
              <span className='text-sm font-semibold text-gray-900 sm:text-base dark:text-neutral-50'>
                Производит
              </span>
            </div>

            <span className='h-px flex-1 bg-gray-200 dark:bg-gray-700' aria-hidden />

            <div className='bg-primary shadow-primary/30 flex size-10 shrink-0 items-center justify-center rounded-full text-white shadow-lg sm:size-12'>
              <Handshake className='size-4.5 sm:size-5.5' />
            </div>

            <span className='h-px flex-1 bg-gray-200 dark:bg-gray-700' aria-hidden />

            <div className='custom-shadow flex w-32 shrink-0 flex-col items-center gap-2.5 rounded-3xl bg-white p-4 text-center sm:w-40 sm:gap-3 sm:p-6 dark:bg-card'>
              <div className='bg-primary/10 text-primary flex size-11 items-center justify-center rounded-2xl sm:size-14'>
                <ShoppingBag className='size-5 sm:size-7' />
              </div>
              <span className='text-sm font-semibold text-gray-900 sm:text-base dark:text-neutral-50'>Нужно</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
