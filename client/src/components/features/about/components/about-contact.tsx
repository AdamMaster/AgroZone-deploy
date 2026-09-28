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

        {/* Реквизиты самозанятого — обязательное требование ЮKassa для
            приёма платежей (см. п. "Ссылка на страницу с реквизитами" в
            анкете) и ст. 9 закона "О защите прав потребителей". Раньше
            строка жила в футере (виден на каждой странице сайта), но по
            просьбе пользователя перенесена сюда — тот же факт, просто не
            вынесен на первый план заглавной плашкой под копирайтом на
            каждом экране, а идёт мелким шрифтом в контексте страницы о
            площадке, как и положено формальным реквизитам. В форму ЮKassa
            в поле "Ссылка на страницу с реквизитами" указывать
            https://agro-zone.ru/about — сама страница не привязана к
            конкретному ID/якорю, ссылка на неё стабильна. */}
        <p className='mt-10 text-center text-xs text-gray-400'>
          Самозанятый Лампежев Адам Аскербиевич, ИНН 070113203655
        </p>
      </Container>
    </section>
  )
}
