import { IsISO8601, IsOptional } from 'class-validator'

// Ручная выдача/снятие premium администратором (/admin/users/:id) — см.
// UserService.setPremiumByAdmin. premiumUntil — конкретная дата, до которой
// premium активен, задаётся админом напрямую (в отличие от обычной покупки
// через PremiumService, которая всегда продлевает СВЕРХ текущей даты).
// null — снять premium прямо сейчас; поле опционально только в смысле
// class-validator (IsOptional пропускает null дальше без ошибки) — сам body
// на клиенте всегда шлёт premiumUntil явно, undefined с фронта не приходит.
export class AdminSetPremiumDto {
  @IsOptional()
  @IsISO8601()
  premiumUntil?: string | null
}
