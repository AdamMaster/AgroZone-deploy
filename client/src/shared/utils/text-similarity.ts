// Лёгкая эвристика "та же словоформа" для русского языка — НЕ полноценный
// морфологический анализатор (грамматика русского знает массу исключений:
// чередования согласных, беглые гласные, супплетивные формы вроде
// "семя"/"семян", которые тут не ловятся), а осознанно упрощённый приём:
// два слова считаем одной основой, если у них совпадает достаточно длинный
// общий префикс — отбрасываем 1-2 последние буквы (типичная длина русского
// падежного/числового окончания у существительных) и сравниваем то, что
// осталось. Ловит самый частый на практике случай — пользователь напечатал
// слово в "своём" падеже/числе, который отличается от названия категории
// всего на одну-две буквы окончания ("груша" -> "Груши", "трактор" ->
// "трактора"). Длину префикса считаем от МЕНЬШЕГО из двух слов, а не от
// каждого по отдельности — иначе "трактор" (7 букв) и "трактора" (8 букв,
// на одну длиннее) обрежутся до разной длины и не совпадут, хотя это одно
// и то же слово в разных падежах.
//
// Используется как ДОПОЛНЕНИЕ к точному совпадению (substring), не замена
// ему — см. CategoryCascader.filteredCategories. Осознанно допускает
// изредка случайные совпадения (например "стойка"/"стойло" тоже дадут
// общий укороченный префикс) — для подсказок в поиске случайный лишний
// результат в списке дешевле, чем спрятанный правильный.
//
// Дублируется в похожем виде на сервере
// (server/src/categories/utils/semantic-search.util.ts,
// см. lexicalSimilarity) — общего пакета между client/ и server/ в
// проекте нет, поэтому шарить этот код напрямую негде; при правке одного
// стоит поправить и второй.
const MIN_WORD_LENGTH_TO_COMPARE = 4

function stemPrefixLength(wordLength: number): number {
  return wordLength >= 6 ? wordLength - 2 : wordLength - 1
}

export function sharesRussianStem(a: string, b: string): boolean {
  const wordA = a.toLowerCase()
  const wordB = b.toLowerCase()

  if (wordA === wordB) return true

  const minLength = Math.min(wordA.length, wordB.length)

  if (minLength < MIN_WORD_LENGTH_TO_COMPARE) return false

  const prefixLength = stemPrefixLength(minLength)

  return wordA.slice(0, prefixLength) === wordB.slice(0, prefixLength)
}

const splitWords = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)

// Насколько название категории соответствует поисковому запросу — для
// сортировки подсказок (чем меньше число, тем релевантнее). Без этого
// подсказки шли в порядке дерева категорий, и точная "Сливы" оказывалась
// ниже "Сливок" и "Масла сливочного" (все они подходят по основе "слив-").
//   0 — название совпадает с запросом целиком;
//   1 — название начинается с запроса;
//   2 — каждое слово запроса совпадает (буквально или по основе) со словом
//       названия;
//   3 — совпадение только через родительские категории пути.
export function rankNameMatch(name: string, query: string): number {
  const normalizedName = name.toLowerCase().trim()
  const normalizedQuery = query.toLowerCase().trim()

  if (normalizedName === normalizedQuery) return 0

  if (normalizedName.startsWith(normalizedQuery)) return 1

  const nameWords = splitWords(normalizedName)
  const queryWords = splitWords(normalizedQuery)

  const isEveryWordMatched = queryWords.every(queryWord =>
    nameWords.some(nameWord => sharesRussianStem(queryWord, nameWord))
  )

  return isEveryWordMatched ? 2 : 3
}
