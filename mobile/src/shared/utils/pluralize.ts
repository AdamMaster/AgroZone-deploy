// Склонение по числу: pluralizeRu(5, ['объявление', 'объявления', 'объявлений'])
// → «объявлений». Та же функция, что на сайте (shared/utils/pluralize.ts).
export const pluralizeRu = (count: number, forms: readonly [string, string, string]): string => {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]

  return forms[2]
}
