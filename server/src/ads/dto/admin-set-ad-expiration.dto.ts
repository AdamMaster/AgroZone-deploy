import { IsISO8601, IsOptional } from 'class-validator'

// Ручная правка срока жизни объявления администратором (/admin/users/:id,
// карточка пользователя) — см. AdsService.setExpirationByAdmin.
// expiresAt: null — объявление больше не истекает само по себе
// (AdsExpirationWorker выбирает только expiresAt: { lte: now }, null туда
// не попадает); дата — новый срок, полностью заменяет текущий expiresAt,
// а не продлевает его (в отличие от бампа за premium, тут админ должен
// видеть и задавать именно итоговую дату).
export class AdminSetAdExpirationDto {
  @IsOptional()
  @IsISO8601()
  expiresAt?: string | null
}
