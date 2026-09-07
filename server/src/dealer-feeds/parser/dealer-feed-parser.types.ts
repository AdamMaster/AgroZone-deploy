// Типы результата разбора фида дилера — см. DealerFeedParserService.
//
// Формат фида — подмножество YML (Yandex Market Language), см. полное
// обоснование выбора формата в ROADMAP.md (F9): у многих 1С/CMS уже есть
// готовая выгрузка в этом формате "из коробки", в отличие от полностью
// самодельного формата, под который каждому дилеру пришлось бы писать
// отдельную интеграцию именно ради этого сайта.
//
// Ожидаемая структура:
//
// <?xml version="1.0" encoding="UTF-8"?>
// <offers>
//   <offer id="dealer-item-123">
//     <name>Трактор МТЗ-82.1</name>
//     <description>Полное описание...</description>
//     <price>1500000</price>
//     <categoryCode>traktory</categoryCode>
//     <address>Краснодарский край, г. Краснодар, ул. Ленина, 1</address>
//     <phone>+7 999 123-45-67</phone>
//     <pictures>
//       <picture>https://dealer.ru/img/1.jpg</picture>
//     </pictures>
//     <params>
//       <param name="Мощность">150 л.с.</param>
//     </params>
//   </offer>
// </offers>
//
// id — обязателен и уникален В ПРЕДЕЛАХ ОДНОГО ФИДА (см. Ad.externalId) —
// по нему при повторной синхронизации DealerFeedSyncService понимает, что
// это та же позиция, что и раньше, а не новая. categoryCode — точный код
// категории (Category.code, см. GET /categories) — сознательно НЕ пытаемся
// угадывать категорию по свободному названию (см. обсуждение с владельцем
// про то, что система должна работать по чётко заданному контракту, а не
// угадывать структуру произвольного XML).

// Одна позиция ДО валидации — как она пришла из XML, разобранная в плоский
// объект (ещё не проверено, что обязательные поля на месте и валидны).
export interface RawFeedOffer {
  id: string | null
  name: string | null
  description: string | null
  price: string | null
  categoryCode: string | null
  address: string | null
  phone: string | null
  pictures: string[]
  params: Record<string, string>
}

// Одна ошибка по конкретной позиции — offerId может быть null, если даже
// сам id не удалось прочитать (тогда позиция идентифицируется по индексу
// в файле для читаемости сообщения).
export interface FeedOfferError {
  offerId: string | null
  offerIndex: number
  offerTitle: string | null
  reason: string
}

// Позиция, прошедшая валидацию и готовая к созданию/обновлению объявления
// — categoryId уже разрешён в реальную категорию, features — уже
// сопоставленные с CategoryFeature значения (см.
// DealerFeedParserService.matchFeatures).
export interface ValidatedFeedOffer {
  externalId: string
  title: string
  description: string
  price: number
  categoryId: string
  address: string
  phone: string
  pictures: string[]
  features: Record<string, unknown>
  raw: RawFeedOffer
}

export interface DealerFeedParseResult {
  // Заполнено, если фид целиком не удалось получить/разобрать (недоступен
  // урл, таймаут, невалидный XML, превышен DEALER_FEED_MAX_OFFERS_HARD_CAP
  // и т.п.) — в этом случае valid/errors всегда пустые.
  globalError: string | null
  valid: ValidatedFeedOffer[]
  errors: FeedOfferError[]
}
