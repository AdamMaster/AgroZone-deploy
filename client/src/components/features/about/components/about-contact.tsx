import Link from 'next/link'

import { Container } from '@/components/layout'
import { Button, Heading } from '@/components/ui'

export const AboutContact = () => {
  return (
    <section className='bg-primary/5 py-20'>
      <Container>
        <div className='mx-auto max-w-xl text-center'>
          <Heading level={2}>Остались вопросы?</Heading>
          <p className='mt-3 text-gray-500'>
            Загляните в раздел «Помощь» — там собраны ответы на частые вопросы о работе с площадкой.
          </p>
          <Button render={<Link href='/help' />} size='lg' className='mt-6'>
            Перейти в Помощь
          </Button>
        </div>
      </Container>
    </section>
  )
}
