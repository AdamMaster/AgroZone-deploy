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

// categoryFeatures здесь больше НЕТ намеренно: раньше бэкенд отдавал
// полный список атрибутов (ICategoryFeature[]) для КАЖДОЙ из 610 категорий
// прямо в массовом дереве (GET /categories) — это ~4271 запись с полными
// label/description/options/units и раздувало ответ на каждую навигацию
// по каталогу примерно до ~2МБ. Теперь атрибуты одной категории грузятся
// отдельно и по требованию через useCategoryFeatures(categoryId) (см.
// categories/hooks) — GET /categories/:id/features. Поле специально
// убрано из типа целиком (не сделано опциональным), чтобы tsc сразу
// показал компиляционной ошибкой любое место, которое ещё читает
// category.categoryFeatures напрямую из дерева.
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
  priceUnits: string[]
  // description сюда намеренно НЕ включён — раньше раздувал каждую
  // страницу сайта на ~1МБ несжатого RSC-payload (дерево грузится в
  // (main)/layout.tsx на каждой навигации, а description нигде из него не
  // читался). Для meta-описания одной категории (единственный, кто его
  // реально использовал) есть отдельный точечный запрос — см.
  // categoriesService.findMeta()/ICategoryMeta ниже и
  // buildCategoryMetaDescription в category-utils.ts. Поле убрано из типа
  // целиком (не опционально) — тот же приём, что и с categoryFeatures чуть
  // выше: tsc сразу подсветит ошибкой любую попытку прочитать
  // category.description из дерева.
  children?: ICategory[]
  isBack?: boolean
}

// Ответ GET /categories/meta — только то, что нужно для meta description
// ОДНОЙ категории (см. CategoriesService.findMetaByFullPath на бэкенде).
export interface ICategoryMeta {
  name: string
  description: string | null
}
