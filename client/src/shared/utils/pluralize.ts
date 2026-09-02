// Классическое склонение существительного по числу для русского языка:
// 1 объявление, 2 объявления, 5 объявлений, 21 объявление, 11 объявлений...
// forms — кортеж [1 штука, 2-4 штуки, 5+ штук], например
// ['объявление', 'объявления', 'объявлений'].
export const pluralizeRu = (count: number, forms: [string, string, string]): string => {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]

  return forms[2]
}
