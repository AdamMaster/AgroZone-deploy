// Админка целиком не имеет смысла пререндерить статически на этапе
// сборки — доступна только авторизованным админам, данные всегда живые
// (очередь модерации, жалобы). force-dynamic разом снимает требование
// Suspense-обёртки вокруг useSearchParams и любых других динамических
// хуков для всех страниц в этой группе роутов, без правки каждой страницы
// по отдельности.
export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
