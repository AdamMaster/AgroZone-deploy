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

// Полные подписи единиц — для выбора единицы цены в фильтре (PRICE_UNITS
// сайта). Винительный падеж («за тонну»); ITEM — «Целиком»: цена всего лота
// без разбивки на единицы.
export const PRICE_UNITS: Readonly<Record<string, string>> = {
  ITEM: 'Целиком',
  TON: 'Тонну',
  KG: 'Килограмм',
  LITER: 'Литр',
  M3: 'м³',
  BAG: 'Мешок',
  HEAD: 'Голову',
  DOSE: 'Дозу',
  RUNNING_METER: 'Погонный метр',
  HA: 'Гектар',
  HOUR: 'Час'
}

// Единица «цена целиком» — у неё нет суффикса «/т», и она же подставляется,
// когда у категории единицы не заданы.
export const WHOLE_PRICE_UNIT = 'ITEM'
