import Link from 'next/link'

import { Container } from '../container'

interface FooterLink {
  label: string
  href: string
}

// Соцсети и категории каталога в футере сознательно не показываем (см.
// обсуждение с пользователем): соцсети — пока не заведены аккаунты, а
// категории дублировали бы навигацию в шапке. Ссылка на приложение тоже
// отложена — появится, когда будет известна дата релиза, чтобы не вести
// пользователя в никуда.
//
// Пункты идут одним плоским рядом без группировки по колонкам — при
// текущих 5 ссылках отдельные подзаголовки-разделы были бы избыточны.
// Если позже список вырастет (блог, для компаний и т.п.), возможно,
// вернёмся к группировке.
const FOOTER_LINKS: FooterLink[] = [
  { label: 'Помощь', href: '/help' },
  { label: 'Безопасность', href: '/safety' },
  { label: 'О компании', href: '/about' },
  { label: 'Пользовательское соглашение', href: '/terms' },
  { label: 'Политика конфиденциальности', href: '/privacy' }
]

export const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer className='mt-16 hidden border-gray-100 bg-gray-100 md:block dark:bg-neutral-900'>
      <Container>
        <div className='flex flex-wrap items-center gap-x-8 gap-y-3 py-10'>
          {FOOTER_LINKS.map(link => (
            <Link key={link.href} href={link.href} className='hover:text-primary text-sm transition-colors'>
              {link.label}
            </Link>
          ))}
        </div>

        <div className='dark:border-accent border-t border-gray-200 py-5'>
          <p className='text-xs text-gray-600'>© {year} AgroZone. Все права защищены.</p>
        </div>
      </Container>
    </footer>
  )
}
