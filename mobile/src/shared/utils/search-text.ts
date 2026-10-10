// Сравнение строки с поисковым запросом без учёта регистра и «ё»: «орёл»
// находится по «орел», «Краснодарский» — по «краснодар».
const normalize = (text: string) => text.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').trim()

export function createTextMatcher(query: string): (text: string) => boolean {
  const needle = normalize(query)

  return needle ? text => normalize(text).includes(needle) : () => true
}
