import { SettingsNav } from '@/components/features/user/components'
import { Container } from '@/components/layout'
import { Heading } from '@/components/ui'

// Все страницы личного кабинета — только для авторизованных, данные
// персональные и всегда живые (объявления, премиум-статус после оплаты
// через query-параметр и т.п.) — статика тут не нужна, а без
// force-dynamic часть вложенных страниц (например /profile/settings/premium,
// где PremiumStatusHandler читает useSearchParams()) ломает сборку тем же
// способом, что раньше ломал /ads/create. Один флаг на весь раздел вместо
// правки каждой страницы отдельно (тот же приём, что в app/(admin)/layout.tsx).
export const dynamic = 'force-dynamic'

export default function MainLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className='pt-3 md:pt-10'>
      <Container>
        <div className='grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] lg:grid-cols-[280px_1fr]'>
          <div className='-ml-4 hidden rounded-xl md:block'>
            <SettingsNav />
          </div>
          <div className='relative w-full max-w-200'>{children}</div>
        </div>
      </Container>
    </div>
  )
}
