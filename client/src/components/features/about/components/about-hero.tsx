import { Plus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { Container } from '@/components/layout'
import { Button, Heading } from '@/components/ui'

const CATEGORIES_STRIP = [
  'С/х техника',
  'Агрохимия',
  'Корма и компоненты',
  'Свежая сельхозпродукция',
  'Оборудование',
  'Животное сырьё',
  'Агрокультуры',
  'Тара и упаковка',
  'Ветеринария'
]

// v3: фоновая фотография вместо градиента/иконок-плашек (см. обсуждение с
// пользователем — просил именно фото фона). Кадр подобран специально так,
// чтобы левая часть кадра была визуально спокойной (тёмная вспаханная
// земля), а правая — с деталями (золотое поле, комбайн, закат): это ровно
// совпадает с вёрсткой, где текст стоит слева, поэтому затемняющий
// градиент только усиливает то, что уже заложено в самом кадре, а не
// борется с ним. Людей/рук на фото нет намеренно — не стоковый
// "рукопожатие" сюжет, а пейзаж, который сам по себе читается как "агро".
export const AboutHero = () => {
  return (
    <>
      <section className='relative isolate overflow-hidden'>
        <Image
          src='/images/about-hero.jpg'
          alt='Уборка урожая на закате — вид с воздуха'
          fill
          priority
          sizes='100vw'
          className='object-cover'
        />
        <Container className=''>
          <div className='relative flex min-h-[520px] max-w-xl flex-col justify-center py-20 sm:min-h-[580px]'>
            <Image src='/images/logo-white.svg' alt='' width={260} height={40} className='mb-2' />
            <Heading level={1} className='leading-[1.1] text-white md:text-5xl'>
              агропромышленная площадка объявлений
            </Heading>

            <p className='mt-6 max-w-xl text-lg leading-snug text-gray-200'>От поля до сделки — в одном месте</p>

            <div className='mt-8 flex flex-wrap gap-3'>
              <Button render={<Link href='/ads/create' />} size='lg'>
                <Plus />
                Разместить объявление
              </Button>
              <Button render={<Link href='/catalog' />} size='lg'>
                Перейти в каталог
              </Button>
              <Button render={<Link href='/help' />} variant='outline' size='lg'>
                Как это работает
              </Button>
            </div>
          </div>
          <div className='relative flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 py-4'>
            {CATEGORIES_STRIP.map((category, index) => (
              <span key={category} className='flex items-center gap-x-3'>
                <span className='text-xs tracking-wide text-white uppercase'>{category}</span>
                {index < CATEGORIES_STRIP.length - 1 && <span className='text-white'>·</span>}
              </span>
            ))}
          </div>
        </Container>
      </section>

      <div className='dark:bg-background bg-white py-5'></div>
    </>
  )
}
