import { EmailChangeConfirm } from '@/components/features'

// Страница открывается только по ссылке из письма (токен в query),
// SEO/статике тут делать нечего. useSearchParams() внутри формы (см.
// компонент ниже) ломает статический пререндер без Suspense — проще и
// надёжнее сразу force-dynamic, тот же приём, что и в
// app/(admin)/layout.tsx и app/(main)/ads/create/page.tsx.
export const dynamic = 'force-dynamic'

export default function ChangeEmail() {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <EmailChangeConfirm />
    </div>
  )
}
