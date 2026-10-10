// Адрес каталога сайта из подсказки поиска → параметры экрана каталога
// приложения: «/catalog/agrokultury/zernovye?search=Пшеница» →
// { category: 'agrokultury/zernovye', search: 'Пшеница' }.
export interface CatalogLinkParams {
  category?: string
  search?: string
}

const CATALOG_PREFIX = '/catalog'

export function parseCatalogUrl(url: string): CatalogLinkParams {
  const [path, query = ''] = url.split('?')
  const category = path.startsWith(CATALOG_PREFIX) ? path.slice(CATALOG_PREFIX.length).replace(/^\/+|\/+$/g, '') : ''
  const search = new URLSearchParams(query).get('search') ?? ''

  return {
    ...(category && { category }),
    ...(search && { search })
  }
}
