// Сравнение слов «по основе» для подсказок категорий — те же правила, что
// client/src/shared/utils/text-similarity.ts сайта (и lexicalSimilarity
// сервера): поиск в приложении и на сайте находит одно и то же.
//
// Это не морфологический анализ, а осознанно простое правило: два слова —
// одна основа, если совпадает достаточно длинный общий префикс (отбрасываем
// 1–2 буквы окончания). Ловит самый частый случай — слово в «своём» падеже
// или числе («груша» → «Груши», «трактор» → «трактора»).
const MIN_WORD_LENGTH_TO_COMPARE = 4

// Длина сравниваемого префикса — от меньшего слова, иначе «трактор» и
// «трактора» обрезались бы по-разному.
const stemPrefixLength = (wordLength: number): number => (wordLength >= 6 ? wordLength - 2 : wordLength - 1)

export function sharesRussianStem(a: string, b: string): boolean {
  const wordA = a.toLowerCase()
  const wordB = b.toLowerCase()

  if (wordA === wordB) return true

  const minLength = Math.min(wordA.length, wordB.length)
  if (minLength < MIN_WORD_LENGTH_TO_COMPARE) return false

  const prefixLength = stemPrefixLength(minLength)

  return wordA.slice(0, prefixLength) === wordB.slice(0, prefixLength)
}

export const splitWords = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)

// Насколько название соответствует запросу (меньше — релевантнее):
// 0 — совпадает целиком, 1 — начинается с запроса, 2 — каждое слово
// запроса совпадает со словом названия (буквально или по основе),
// 3 — совпадение только через родительские категории.
export function rankNameMatch(name: string, query: string): number {
  const normalizedName = name.toLowerCase().trim()
  const normalizedQuery = query.toLowerCase().trim()

  if (normalizedName === normalizedQuery) return 0
  if (normalizedName.startsWith(normalizedQuery)) return 1

  const nameWords = splitWords(normalizedName)
  const isEveryWordMatched = splitWords(normalizedQuery).every(queryWord =>
    nameWords.some(nameWord => sharesRussianStem(queryWord, nameWord))
  )

  return isEveryWordMatched ? 2 : 3
}
