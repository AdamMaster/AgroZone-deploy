import { IsEmail, IsNotEmpty, MinLength } from 'class-validator'

import { NormalizeEmail } from '@/libs/common/decorators/normalize-email.decorator'

export class ChangeEmailDto {
  @IsNotEmpty({ message: 'Новый адрес электронной почты обязателен' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'Введите корректный адрес электронной почты' })
  newEmail!: string

  @IsNotEmpty({ message: 'Введите текущий пароль для подтверждения изменений' })
  @MinLength(6, { message: 'Пароль должен быть не менее 6 символов' })
  password!: string
}
