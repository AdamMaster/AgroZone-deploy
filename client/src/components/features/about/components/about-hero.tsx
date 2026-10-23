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
      {/* На телефоне блок занимает всю видимую высоту: экран минус шапка (--header-height — реальная высота <header>, её
      выставляет CategoryMenu; до гидрации запасные 4rem) и нижняя панель (h-14 = 3.5rem + безопасная зона). Полоса категорий внизу входит в эту высоту: основной блок растянут
      (flex-1), а она прижата к низу. С md шапка и панель другие — высота по содержимому. */}
      <section className='relative isolate flex flex-col overflow-hidden md:min-h-0'>
        <Image
          src='/images/about-hero.jpg'
          alt='Уборка урожая на закате — вид с воздуха'
          fill
          priority
          sizes='100vw'
          className='object-cover'
        />
        <div className='pointer-events-none absolute inset-0 bg-black/35 md:hidden' />
        <Container className='flex w-full flex-1 flex-col'>
          <div className='relative flex min-h-[calc(100svh-var(--header-height,4rem)-3.5rem-env(safe-area-inset-bottom))] max-w-xl flex-1 flex-col justify-center py-12 sm:py-20 md:min-h-[580px] md:flex-none'>
            <Image
              src='/images/logo-white.svg'
              alt=''
              width={260}
              height={40}
              className='mb-2 h-auto w-48 sm:w-[260px]'
            />
            <Heading level={1} className='text-3xl leading-[1.1] text-white sm:text-4xl lg:text-5xl'>
              агропромышленная площадка объявлений
            </Heading>

            <p className='mt-4 max-w-xl text-base leading-snug text-gray-200 sm:mt-6 sm:text-lg'>
              Купи. Продай. Вырасти
            </p>

            <div className='mt-8 flex flex-wrap gap-1 sm:flex-row md:gap-3'>
              <Button
                render={<Link href='/ads/create' />}
                nativeButton={false}
                size='lg'
                className='rounded-md sm:w-auto sm:rounded-lg'
              >
                <Plus />
                Разместить объявление
              </Button>
              <Button
                render={<Link href='/catalog' />}
                nativeButton={false}
                size='lg'
                className='rounded-md sm:w-auto sm:rounded-lg'
              >
                Перейти в каталог
              </Button>
              <Button
                render={<Link href='/help' />}
                nativeButton={false}
                variant='outline'
                size='lg'
                className='rounded-md sm:w-auto sm:rounded-lg'
              >
                Как это работает
              </Button>
            </div>
          </div>
          <div className='relative hidden flex-wrap items-center justify-center gap-x-3 gap-y-1.5 py-4 sm:flex'>
            {CATEGORIES_STRIP.map((category, index) => (
              <span key={category} className='flex items-center gap-x-3'>
                <span className='text-xs tracking-wide text-white uppercase'>{category}</span>
                {index < CATEGORIES_STRIP.length - 1 && <span className='text-white'>·</span>}
              </span>
            ))}
          </div>
        </Container>
      </section>

      <div className='dark:bg-background bg-white py-0 lg:py-5'></div>
    </>
  )
}
