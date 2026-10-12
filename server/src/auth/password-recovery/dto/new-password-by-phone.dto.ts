import { IsNotEmpty, IsString, Length } from 'class-validator'
import { NewPasswordDto } from './new-password.dto'

// Номер и id проверки звонка (его отдаёт ручка phone/status, как при
// регистрации) плюс новый пароль из NewPasswordDto.
export class NewPasswordByPhoneDto extends NewPasswordDto {
  @IsString({ message: 'Номер телефона должен быть строкой.' })
  @IsNotEmpty({ message: 'Укажите номер телефона.' })
  phone!: string

  @IsString({ message: 'Код должен быть строкой.' })
  @IsNotEmpty({ message: 'Код обязателен.' })
  @Length(1, 32, { message: 'Некорректный код подтверждения.' })
  code!: string
}
