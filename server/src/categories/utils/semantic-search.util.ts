// Чистые функции скоринга семантического поиска категорий — вынесены из
// CategoriesService, чтобы ТОЧНО ТАКОЙ ЖЕ алгоритм (без риска разъехаться)
// мог использовать и калибровочный скрипт (scripts/test-search-quality.ts),
// который прогоняет контрольные запросы после смены модели эмбеддингов и
// печатает реальные score — по ним же вручную подбираются
// CATEGORY_SEARCH_MIN_SCORE / CATEGORY_SEARCH_LEXICAL_BOOST_WEIGHT (см.
// CategoriesService). Дублировать dotProduct/levenshtein/lexicalSimilarity
// в двух местах было бы ровно тем случаем, когда один поправили, а про
// второй забыли — и калибровка внезапно перестаёт отражать то, что реально
// исполняется в проде.

/** Косинусное сходство L2-нормализованных векторов = обычное скалярное произведение. */
export function dotProduct(a: number[], b: number[]): number {
  let sum = 0

  for (let i = 0; i < a.length && i < b.length; i++) {
    sum += a[i] * b[i]
  }

  return sum
}

export function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))

  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }

  return dp[a.length][b.length]
}

const MIN_WORD_LENGTH_TO_COMPARE_STEMS = 4

function stemPrefixLength(wordLength: number): number {
  return wordLength >= 6 ? wordLength - 2 : wordLength - 1
}

/**
 * Грубая (не лингвистическая) эвристика общей русской словоформы: считаем,
 * что два слова — формы одного и того же слова, если у них совпадает
 * достаточно длинный префикс. Не отличает падеж/число морфологически
 * корректно и не ловит супплетивные формы (семя/семян), но для
 * буст-эвристики в поиске это осознанный компромисс в пользу recall.
 *
 * ВНИМАНИЕ: это намеренный дубликат client/src/shared/utils/text-similarity.ts
 * (sharesRussianStem) — общего пакета между client/ и server/ в монорепе
 * нет, так что при правке одной копии нужно поправить и вторую.
 */
function sharesRussianStem(a: string, b: string): boolean {
  if (a === b) return true

  const minLength = Math.min(a.length, b.length)

  if (minLength < MIN_WORD_LENGTH_TO_COMPARE_STEMS) return false

  const prefixLength = stemPrefixLength(minLength)

  return a.slice(0, prefixLength) === b.slice(0, prefixLength)
}

/**
 * Лексическая близость запроса к термину, от 0 до 1 — буквальное вхождение
 * (в любую сторону) даёт максимум, иначе — общая русская словоформа
 * (sharesRussianStem, см. выше) с отдельным словом термина тоже даёт
 * максимум, а иначе берём лучшую (наименьшее расстояние Левенштейна,
 * нормированное на длину) близость запроса к ОТДЕЛЬНОМУ слову термина, а
 * не ко всему термину целиком — термины часто составные ("туя шаровидная",
 * "саженцы плодовых деревьев"), и сравнивать короткий запрос со всей
 * строкой сразу бессмысленно ослабляло бы бонус ровно для тех терминов,
 * где он нужнее всего.
 */
export function lexicalSimilarity(query: string, term: string): number {
  const q = query.toLowerCase()
  const t = term.toLowerCase()

  if (t.includes(q) || q.includes(t)) return 1

  let best = 0

  for (const word of t.split(/\s+/)) {
    if (sharesRussianStem(q, word)) return 1

    const maxLen = Math.max(q.length, word.length)

    if (maxLen === 0) continue

    const similarity = 1 - levenshtein(q, word) / maxLen

    if (similarity > best) best = similarity
  }

  return best
}

/**
 * Итоговый score одного термина против запроса — чистая косинусная близость
 * эмбеддингов плюс взвешенный лексический бонус (см. lexicalSimilarity —
 * зачем он нужен поверх голого cosine similarity).
 */
export function computeTermScore(
  queryVector: number[],
  termVector: number[],
  query: string,
  term: string,
  lexicalBoostWeight: number
): number {
  return dotProduct(queryVector, termVector) + lexicalBoostWeight * lexicalSimilarity(query, term)
}
