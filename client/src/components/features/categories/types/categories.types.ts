export interface ICategoryFeature {
  id: string
  categoryId: string
  name: string
  label: string
  type: 'TEXT' | 'NUMBER' | 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN'
  options?: string[]
  // Единицы измерения для type = NUMBER. Первый элемент — каноническая
  // единица: именно в ней значение хранится в Ad.features (см.
  // dynamic-field.tsx — при вводе в другой единице значение
  // конвертируется в каноническую перед сохранением). Если элементов
  // больше одного — пользователь выбирает нужную при заполнении поля,
  // если один — просто показывается подписью рядом с полем. Пустой
  // массив/undefined — у поля нет единицы измерения вовсе.
  units?: string[]
  // Отдаётся бэкендом (CategoryFeature.filterable), но раньше не было в
  // типе — нужно для сайдбара фильтра, чтобы не показывать нефильтруемые
  // поля (см. audit categories.ts).
  filterable: boolean
  createdAt: Date
  updatedAt: Date
}

// Результат семантического поиска категории по свободному тексту (см.
// CategoriesService.searchBySemantic на бэкенде) — например запрос "туи"
// находит категорию "Саженцы хвойных пород", хотя слова "туя" нет ни в её
// названии, ни в пути. matchedTerm — по какому конкретно слову/синониму
// совпало (полезно для отладки и как подсказка в UI). Бэкенд отдаёт только
// листовые категории (без детей) — это единственные категории, которые
// вообще можно выбрать как итоговую категорию объявления (см.
// CategoryCascader.handleCategorySelect), так что любой результат отсюда
// сразу финализирует выбор, без дальнейшего уточнения по колонкам.
export interface ICategorySearchSuggestion {
  id: string
  name: string
  slug: string
  parentName: string | null
  matchedTerm: string
  score: number
}

export interface ICategory {
  id: string
  name: string
  slug: string
  code: string
  iconId: string | null
  parentId: string | null
  level: number
  sortOrder: number
  path: string[]
  fullPath: string
  categoryFeatures: ICategoryFeature[]
  priceUnits: string[]
  children?: ICategory[]
  isBack?: boolean
}
