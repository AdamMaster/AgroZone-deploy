// Цена из поля ввода: «1 500,5» → «1500.5».
export const normalizePrice = (price: string): string => price.replace(/\s/g, '').replace(',', '.')

// Пусто — «Цена договорная», это допустимо; иначе должно получиться число
// («1.2.3», «12,5,3» сервер отклонил бы английским текстом валидатора).
export const isValidPrice = (price: string): boolean => {
  const normalized = normalizePrice(price)

  return normalized === '' || /^\d+(\.\d+)?$/.test(normalized)
}
