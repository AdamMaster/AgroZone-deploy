import Image from 'next/image'

import { Container } from '@/components/layout'
import { Heading } from '@/components/ui'

// v3 (см. обсуждение с пользователем): вместо иконок-диаграммы — реальное
// фото, паттерн "как на Авито" (текст слева, квадратная картинка со
// скруглёнными углами справа). Кадр подобран в той же тёплой золотой
// гамме, что и фон в AboutHero — рукопожатие без перчаток, обе руки
// открытые, что буквально показывает "прямая сделка между тем, кто
// производит, и тем, кому нужно" из заголовка слева, без посредников.
//
// Вокруг самого квадрата — два декоративных слоя (снизу вверх): мягкое
// цветное свечение с блюром и акцентная подложка того же скругления,
// сдвинутая вниз-вправо и выглядывающая из-за фото. Оба используют только
// primary-цвет, который уже применяется в бейджах/иконках по всей
// странице — новых цветов/паттернов в проект не добавляется.
export const AboutMission = () => {
  return (
    <section className='dark:bg-background bg-white py-24'>
      <Container>
        <div className='grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16'>
          <div className='text-center lg:text-left'>
            <span className='bg-primary/10 text-primary mb-5 inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase'>
              Наша миссия
            </span>

            <Heading
              level={2}
              className='text-3xl leading-tight font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-neutral-50'
            >
              Прямые сделки между тем, кто производит, и тем, кому это нужно.
            </Heading>

            <p className='mx-auto mt-5 max-w-md text-lg text-gray-500 lg:mx-0'>
              AgroZone существует, чтобы им было проще найти друг друга — без посредников и лишних звонков.
            </p>
          </div>

          <div className='relative mx-auto h-[340px] w-full max-w-md'>
            <div className='custom-shadow relative h-full w-full overflow-hidden rounded-[42px]'>
              <Image
                src='/images/armsnake.jpg'
                alt='Рукопожатие в поле — сделка между продавцом и покупателем напрямую'
                fill
                sizes='(min-width: 1024px) 480px, 90vw'
                className='object-cover'
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
