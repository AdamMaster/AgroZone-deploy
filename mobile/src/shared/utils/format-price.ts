import { PRICE_UNITS_SHORT } from '@/shared/constants/price-units'

const NO_PRICE_LABEL = 'Цена договорная'

// Один форматтер на всё приложение: создание Intl.NumberFormat заметно
// дороже форматирования, а в ленте цена форматируется для каждой карточки.
const priceFormatter = new Intl.NumberFormat('ru-RU')

// Правила те же, что у formatPrice/formatPriceWithUnit на сайте
// (client/src/shared/utils/format-price.ts): отсутствие цены и ноль —
// «Цена договорная», единица — через дробь: «14 200 ₽/т».
export function formatPrice(price: number | null | undefined): string {
  if (!price) return NO_PRICE_LABEL

  return `${priceFormatter.format(price)} ₽`
}

export function formatPriceWithUnit(price: number | null | undefined, unit?: string | null): string {
  const formatted = formatPrice(price)

  if (!price || !unit) return formatted

  const short = PRICE_UNITS_SHORT[unit]

  return short ? `${formatted}/${short}` : formatted
}
