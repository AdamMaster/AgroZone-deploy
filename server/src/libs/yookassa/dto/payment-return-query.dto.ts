import { IsString, IsUUID, MaxLength } from 'class-validator'

// GET /payments/yookassa/return: ЮKassa возвращает сюда пользователя после
// оплаты из приложения (адрес собран в buildReturnUrl).
export class PaymentReturnQueryDto {
  // Адрес возврата в приложение, например agrozone://payment-return.
  @IsString()
  @MaxLength(512)
  to!: string

  // Номер платежа (запись в нашей базе): приложение по нему узнаёт результат.
  @IsUUID()
  purchase!: string
}
