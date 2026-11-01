import { IsEmail, IsNotEmpty } from 'class-validator'

import { NormalizeEmail } from '@/libs/common/decorators/normalize-email.decorator'

export class ResetPasswordDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Введите корректный адрес электронной почты.' })
  @IsNotEmpty({ message: 'Поле email не может быть пустым.' })
  email!: string
}
