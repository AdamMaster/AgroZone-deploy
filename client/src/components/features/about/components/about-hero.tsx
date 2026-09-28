import Link from 'next/link'

import { Container } from '@/components/layout'
import { Button } from '@/components/ui'

const CATEGORIES_STRIP = [
  'С/х техника',
  'Агрохимия',
  'Корма и компоненты',
  'Свежая сельхозпродукция',
  'Оборудование',
  'Животное сырьё',
  'Агрокультуры',
  'Тара и упаковка'
]

// Три "плашки" для правой колонки — не случайные, а самые узнаваемые из
// CATEGORIES_STRIP ниже (техника, свежая продукция, животное сырьё).
// Специально без иконок: на странице уже есть блок с иконками-карточками
// (AboutMission) и блок с иконками-функциями (AboutTrust) — если Hero
// повторит тот же приём третьим по счёту, три секции подряд начинают
// выглядеть одинаково. Здесь акцент только на тексте и цвете.
const FLOATING_CATEGORIES = ['С/х техника', 'Свежая продукция', 'Животное сырьё']

// v2 (см. обсуждение с пользователем — тот же переход на слева-направо
// вёрстку, что и у AboutMission, вместо полностью центрированного блока).
// Заодно добавлены CTA-кнопки — раньше на первом экране "О компании" не
// было ни одного действия, только текст.
export const AboutHero = () => {
  return (
    <section className='dark:to-background relative mt-4 overflow-hidden bg-gradient-to-b from-[#f2f8ea] to-white dark:from-neutral-900'>
      <div className='bg-primary/20 pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full blur-3xl' />
      <div className='pointer-events-none absolute -bottom-40 -left-24 h-100 w-100 rounded-full bg-[#c99a4b]/25 blur-3xl' />

      <Container className='relative pt-24 pb-16 lg:pt-28'>
        <div className='grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-10'>
          <div className='text-center lg:text-left'>
            <span className='mb-6 inline-block rounded-2xl bg-neutral-900 px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase'>
              О компании
            </span>

            <h1 className='text-4xl leading-tight font-bold tracking-tight text-gray-900 md:text-5xl dark:text-neutral-50'>
              <span className='text-primary'>AgroZone</span>
              <br /> агропромышленная площадка объявлений
            </h1>

            <p className='mx-auto mt-6 max-w-xl text-lg leading-snug lg:mx-0'>
              Сельхозтехника, продукция, услуги и всё, что нужно для работы в агросекторе — в одном месте.
            </p>

            <div className='mt-8 flex flex-wrap justify-center gap-3 lg:justify-start'>
              <Button render={<Link href='/catalog' />} size='lg'>
                Перейти в каталог
              </Button>
              <Button render={<Link href='/help' />} variant='outline' size='lg'>
                Как это работает
              </Button>
            </div>
          </div>

          <div className='relative mx-auto hidden h-72 w-full max-w-sm sm:h-80 lg:block'>
            {FLOATING_CATEGORIES.map((label, index) => (
              <div
                key={label}
                className={`custom-shadow dark:bg-card absolute w-fit rounded-2xl bg-white px-5 py-3.5 ${
                  index === 0
                    ? 'top-0 left-2 -rotate-6'
                    : index === 1
                      ? 'top-28 right-0 rotate-3'
                      : 'bottom-0 left-14 rotate-2'
                }`}
              >
                <span className='text-sm font-semibold text-gray-900 dark:text-neutral-50'>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>

      <div className='relative py-4 pb-18'>
        <Container>
          <div className='flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5'>
            {CATEGORIES_STRIP.map((category, index) => (
              <span key={category} className='flex items-center gap-x-3'>
                <span className='text-xs tracking-wide text-gray-500 uppercase'>{category}</span>
                {index < CATEGORIES_STRIP.length - 1 && <span className='text-primary/40'>·</span>}
              </span>
            ))}
          </div>
        </Container>
      </div>
    </section>
  )
}
