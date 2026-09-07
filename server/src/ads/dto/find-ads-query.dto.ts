import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { PriceUnit } from '@/generated/prisma/client'
import { UserType } from '@/generated/prisma/enums'

// Сортировка списка объявлений. По умолчанию (если sortBy не передан) —
// DATE_DESC, см. AdsService.findAll.
export enum AdsSortBy {
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  // Требует lat/lng в запросе (см. AdsService.findAll) — без них 400.
  DISTANCE_ASC = 'distance_asc'
}

export class FindAdsQueryDto {
  @IsOptional()
  @IsString()
  categoryId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number

  @IsOptional()
  @IsString()
  search?: string

  // Единица цены, в рамках которой действует диапазон minPrice/maxPrice.
  // Обязательна, если задан хотя бы один из них — сравнивать цену "за кг" и
  // "за тонну" в одном диапазоне некорректно (см. AdsService.findAll).
  @IsOptional()
  @IsEnum(PriceUnit)
  unit?: PriceUnit

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number

  @IsOptional()
  @IsEnum(AdsSortBy)
  sortBy?: AdsSortBy

  // Несмотря на название (оставили для совместимости с фронтом/URL) — это
  // НЕ настоящий ISO 3166-2:RU код, а базовое название региона из
  // справочника RuCity (например "Алтай", "Краснодарский" — см.
  // AdsService.getAvailableLocations/buildRegionMatchPattern). Настоящие
  // ISO-коды регионов мы намеренно не храним и не сравниваем — не удалось
  // надёжно подтвердить точный формат (см. обсуждение). Не зависит от
  // выбранной категории/уровня каталога, в отличие от features.
  @IsOptional()
  @IsString()
  regionIsoCode?: string

  // Более узкий уровень, чем regionIsoCode — точечный фильтр по
  // конкретному городу/селу (Ad.localityFiasId). Взаимоисключим с
  // regionIsoCode на фронте (см. LocationFilter), но бэкенд не завязан на
  // это и просто ANDит оба условия, если вдруг придут одновременно.
  @IsOptional()
  @IsString()
  localityFiasId?: string

  // JSON-строка вида:
  //   {"soil_type":["Чернозём"],"humidity":{"min":10,"max":80},"is_organic":true}
  // Ключи должны совпадать с CategoryFeature.name выбранной категории;
  // если задан features — categoryId обязателен. Разбирается и
  // валидируется в AdsService.resolveFeatureFilters (там же тихо
  // игнорируются неизвестные/нефильтруемые/устаревшие ключи).
  @IsOptional()
  @IsString()
  features?: string

  // Фильтр по самозаявленному типу продавца (частное лицо / ИП / компания)
  // — сравнивается с users.type (см. AdsService.findAll). Не зависит от
  // выбранной категории, как и regionIsoCode/localityFiasId.
  @IsOptional()
  @IsEnum(UserType)
  sellerType?: UserType

  // Все объявления конкретного продавца — публичная страница продавца
  // (/sellers/:id на фронте) и блок "Ещё от продавца" на странице
  // объявления. В отличие от sellerType (самозаявленный ТИП продавца),
  // это фильтр по конкретному users.id — сравнивается с ads.user_id (см.
  // AdsService.findAll). Специально не проверяем здесь, что такой
  // пользователь существует — не найдётся ни одного объявления, ответ
  // будет просто пустым списком, как и для любого другого фильтра без
  // совпадений.
  @IsOptional()
  @IsString()
  sellerId?: string

  // Исключить конкретное объявление из результата — блок "Похожие
  // объявления" на странице объявления: те же categoryId, но без самого
  // текущего объявления (см. AdsService.findAll).
  @IsOptional()
  @IsString()
  excludeAdId?: string

  // Геопоиск (F3) — точка, от которой считается расстояние до каждого
  // объявления (формула гаверсинуса по Ad.lat/Ad.lng, см.
  // AdsService.findAll). lat и lng обязательны вместе — оба или ни
  // одного, проверяется в сервисе, а не декоратором (class-validator не
  // умеет "оба или ни одного" из коробки без кастомного валидатора ради
  // одного правила). Источник точки на фронте — геолокация браузера ИЛИ
  // ручной адрес через AddressInput (см. обсуждение с владельцем), сам
  // бэкенд не различает откуда взялись координаты.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number

  // Радиус в километрах — фильтрует объявления дальше этого расстояния от
  // lat/lng. Без lat/lng бессмысленен — проверяется в сервисе. Верхняя
  // граница 1000 км — больше не имеет смысла для радиус-поиска (это уже
  // почти вся европейская часть России), нижняя 1 км защищает от
  // случайного radiusKm=0, из-за которого пустой результат выглядел бы
  // как баг, а не как правильно сработавший фильтр.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  radiusKm?: number
}
