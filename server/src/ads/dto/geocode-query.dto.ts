import { Type } from 'class-transformer'
import { IsNumber, Max, Min } from 'class-validator'

// Обратный геокодинг: координаты точки -> адрес (GET /ads/geocode).
// Раньше lat/lon уходили в платный Яндекс-геокодер без какой-либо
// проверки — теперь отсекаем мусор (NaN, строки, координаты за пределами
// Земли) до обращения во внешний API.
export class GeocodeQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number
}
