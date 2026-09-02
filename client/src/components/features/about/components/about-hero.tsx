import { Container } from '@/components/layout'

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

export const AboutHero = () => {
  return (
    <section className='relative mt-4 overflow-hidden bg-gradient-to-b from-[#f2f8ea] to-white dark:from-neutral-900 dark:to-background'>
      {/* <div
        className='pointer-events-none absolute inset-0 opacity-[0.35]'
        style={{
          backgroundImage: 'radial-gradient(circle, #40a500 1px, transparent 1px)',
          backgroundSize: '26px 26px'
        }}
      /> */}
      <div className='bg-primary/20 pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full blur-3xl' />
      <div className='pointer-events-none absolute -bottom-40 -left-24 h-100 w-100 rounded-full bg-[#c99a4b]/25 blur-3xl' />

      <Container className='relative pt-28 pb-14'>
        <div className='mx-auto max-w-3xl text-center'>
          <span className='mb-6 inline-block rounded-2xl bg-neutral-900 px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase'>
            О компании
          </span>

          <h1 className='text-4xl leading-tight font-bold tracking-tight text-gray-900 md:text-5xl'>
            <span className='text-primary'>AgroZone</span> — агропромышленная площадка объявлений
          </h1>

          <p className='mx-auto mt-6 max-w-2xl text-lg leading-snug'>
            Сельхозтехника, продукция, услуги и всё, что нужно для работы в агросекторе — в одном месте.
          </p>
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
