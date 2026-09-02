import { Container } from '@/components/layout'

export const AboutMission = () => {
  return (
    <section className='bg-white py-30 dark:bg-background'>
      <Container>
        <div className='relative mx-auto max-w-3xl text-center'>
          <span className='text-primary/15 pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 font-serif text-[9rem] leading-none select-none'>
            “
          </span>
          <p className='relative text-2xl leading-snug tracking-tight text-gray-700'>
            Агропромышленный рынок держится на прямых договорённостях — между теми, кто производит, и теми, кому это
            нужно. <br /> Мы делаем <span className='text-primary font-bold'>AgroZone</span>, чтобы находить друг друга
            было проще: понятные категории под сельхозтехнику, продукцию и услуги, фильтры по тем параметрам, которые
            реально важны в этой сфере, и модерация каждого объявления — чтобы каталог оставался тем местом, где можно
            спокойно вести дела.
          </p>
        </div>
      </Container>
    </section>
  )
}
