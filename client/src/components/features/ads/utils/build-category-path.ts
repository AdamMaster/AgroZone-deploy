import { findCategoryById, getPathToCategory } from '@/shared/utils'

import { CategoryBreadcrumbItem } from '../components/category-breadcrumbs'
import { ICategory } from '../types/ad.types'

// Цепочка категорий от корня до категории объявления с готовыми ссылками на
// каталог — для хлебных крошек AdDetail (и JSON-LD на публичной странице).
// Общая для публичной страницы объявления и страницы просмотра владельца.
export const buildCategoryPath = (
  categories: ICategory[],
  categoryId: string
): (CategoryBreadcrumbItem & { href: string })[] =>
  getPathToCategory(categories, categoryId)
    .map(id => findCategoryById(categories, id))
    .filter((category): category is ICategory => category !== null)
    .map(category => ({ name: category.name, href: `/catalog/${category.fullPath}` }))
