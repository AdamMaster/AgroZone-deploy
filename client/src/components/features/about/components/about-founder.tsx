import { Container } from '@/components/layout'

export const AboutFounder = () => {
  return (
    <section className='bg-white py-20 dark:bg-background'>
      <Container>
        <div className='to-primary relative mx-auto max-w-3xl overflow-hidden rounded-4xl bg-gradient-to-br from-emerald-700 p-8 text-white'>
          <div className='pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl' />

          <span className='font-serif text-8xl leading-none text-white/20 select-none'>“</span>

          <p className='relative -mt-6 text-lg leading-relaxed'>
            AgroZone мы делаем с вниманием к каждой детали — от того, как устроены категории, до того, как быстро
            отвечаем на вопросы. Площадка только начинает расти, и для нас важно с самого начала задать тон: чтобы здесь
            было удобно и спокойно вести дела — и продавцам, и покупателям. Каждое сообщение и предложение мы читаем
            внимательно и стараемся реагировать быстро: если что-то работает не так, как должно, — напишите, разберёмся.
          </p>

          <p className='relative mt-6 text-sm text-white/70'>— Основатель AgroZone</p>
        </div>
      </Container>
    </section>
  )
}
