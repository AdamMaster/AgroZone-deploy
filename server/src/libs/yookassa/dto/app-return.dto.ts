import { IsOptional, IsString, MaxLength } from 'class-validator'

// Тело запроса на оплату: запрос из мобильного приложения добавляет адрес, в
// который вернуть пользователя после оплаты (agrozone://payment-return). С
// сайта поле не приходит, и возврат идёт на страницу сайта, как раньше.
export class AppReturnDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  returnUri?: string
}
