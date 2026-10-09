// Короткие подписи единиц цены для строки «14 200 ₽/т» — те же, что на сайте
// (PRICE_UNITS_SHORT в client/src/shared/constants/units.ts). Ключи —
// значения enum PriceUnit сервера в том же регистре, в котором они приходят
// в ad.unit. ITEM («цена целиком» — трактор, участок, партия одним лотом)
// намеренно отсутствует: суффикса у такой цены нет по смыслу.
export const PRICE_UNITS_SHORT: Readonly<Record<string, string>> = {
  TON: 'т',
  KG: 'кг',
  LITER: 'л',
  M3: 'м³',
  BAG: 'мешок',
  HEAD: 'гол.',
  DOSE: 'доза',
  RUNNING_METER: 'п. м.',
  HA: 'га',
  HOUR: 'час'
}
