import { ReactNode } from 'react'

import { LEGAL_DETAILS } from '@/components/features/legal/legal-details'
import { Heading } from '@/components/ui'

import { Container } from '../container'

export interface GuideItem {
  question: string
  answer: ReactNode
}

export interface GuideSection {
  id: string
  title: string
  description: string
  items: GuideItem[]
}

// Тот же набор классов, что у LegalSection (components/layout/legal-page):
// списки внутри ответов оформляются одинаково на всех текстовых страницах
// сайта — справочные страницы визуально продолжают юридические документы,
// а не живут своей отдельной вёрсткой.
const PROSE_CLASS_NAME =
  'space-y-3 leading-relaxed text-gray-600 dark:text-neutral-300 [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_strong]:font-semibold [&_strong]:text-gray-800 dark:[&_strong]:text-neutral-100'

const SCROLL_MARGIN_CLASS_NAME = 'scroll-mt-[calc(var(--header-height,4rem)+1rem)]'

interface GuidePageProps {
  title: string
  lead: string
  // Оговорка/предупреждение сразу под вводным абзацем (например, что
  // страница не является юридической консультацией).
  notice?: ReactNode
  sections: GuideSection[]
  // Якоря блоков, которые страница рисует сама через children (например,
  // «Поддержка»), — чтобы они попадали в оглавление после основных разделов.
  extraNav?: { id: string; title: string }[]
  children?: ReactNode
}

// Общий шаблон справочных страниц (Помощь, Безопасность): заголовок, вводный
// абзац, оглавление с якорями и разделы «вопрос — ответ». Текст каждой
// страницы лежит в её собственном списке GuideSection[] — здесь только
// вёрстка, поэтому внешний вид справочных страниц меняется в одном месте.
export const GuidePage = ({ title, lead, notice, sections, extraNav = [], children }: GuidePageProps) => {
  const navLinks = [...sections.map(({ id, title }) => ({ id, title })), ...extraNav]

  return (
    <Container className='max-w-4xl py-10 md:py-14'>
      <Heading level={1}>{title}</Heading>
      <p className='mt-3 max-w-2xl leading-relaxed text-gray-600 dark:text-neutral-300'>{lead}</p>

      {notice && (
        <div className='mt-6 rounded-xl border border-gray-200 p-4 text-sm leading-relaxed text-gray-600 sm:p-5 dark:border-neutral-700 dark:text-neutral-300'>
          {notice}
        </div>
      )}

      <nav aria-label='Содержание' className='mt-8 rounded-xl bg-gray-50 p-5 sm:p-6 dark:bg-neutral-800'>
        <p className='text-sm font-medium text-gray-500 dark:text-neutral-400'>Содержание</p>
        <ul className='mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2'>
          {navLinks.map(link => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                className='hover:text-primary text-gray-800 transition-colors dark:text-neutral-100'
              >
                {link.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className='mt-10 space-y-12'>
        {sections.map(section => (
          <section key={section.id} id={section.id} className={SCROLL_MARGIN_CLASS_NAME}>
            <Heading level={2}>{section.title}</Heading>
            <p className='mt-2 text-gray-500 dark:text-neutral-400'>{section.description}</p>

            <div className='mt-6 divide-y divide-gray-200 border-t border-gray-200 dark:divide-neutral-700 dark:border-neutral-700'>
              {section.items.map(item => (
                <article key={item.question} className='py-5'>
                  <Heading level={4} as='h3'>
                    {item.question}
                  </Heading>
                  <div className={`mt-3 ${PROSE_CLASS_NAME}`}>{item.answer}</div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {children}
      </div>
    </Container>
  )
}

interface SupportContactsProps {
  // Первый абзац блока — зависит от страницы («Не нашли ответ…» в справке,
  // «Столкнулись с мошенничеством…» в безопасности).
  intro: string
}

// Блок «Поддержка» в конце справочных страниц: два канала связи из реальных
// возможностей площадки (чат-виджет и почта) и подсказка, что указать в
// обращении. id='support' — якорь для оглавления (см. GuidePage.extraNav).
export const SupportContacts = ({ intro }: SupportContactsProps) => {
  return (
    <section id='support' className={SCROLL_MARGIN_CLASS_NAME}>
      <Heading level={2}>Поддержка</Heading>
      <div className='mt-4 rounded-xl bg-gray-50 p-5 sm:p-6 dark:bg-neutral-800'>
        <div className={PROSE_CLASS_NAME}>
          <p>{intro}</p>
          <ul>
            <li>
              <strong>Чат поддержки</strong> — круглая кнопка в правом нижнем углу сайта. Подойдёт для быстрых вопросов
              по работе площадки;
            </li>
            <li>
              <strong>Электронная почта</strong> —{' '}
              <a href={`mailto:${LEGAL_DETAILS.supportEmail}`} className='text-primary hover:underline'>
                {LEGAL_DETAILS.supportEmail}
              </a>
              . Удобно для вопросов об оплате и возвратах, а также если нужно приложить файлы.
            </li>
          </ul>
          <p>
            Чтобы мы ответили быстрее, укажите ссылку на объявление, о котором идёт речь, коротко опишите проблему и,
            если есть, приложите скриншот.
          </p>
        </div>
      </div>
    </section>
  )
}
