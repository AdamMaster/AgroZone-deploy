import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

import { NormalizeLoginIdentifier } from '@/libs/common/decorators/normalize-email.decorator'

export class LoginDto {
  @IsNotEmpty({ message: 'Поле Email или Телефон обязательно для заполнения.' })
  @IsString({ message: 'Логин должен быть строкой.' })
  @NormalizeLoginIdentifier()
  login!: string

  @IsString({ message: 'Пароль должен быть строкой.' })
  @IsNotEmpty({ message: 'Пароль не может быть пустым.' })
  @MinLength(6, { message: 'Пароль должен содержать не менее 6 символов.' })
  password!: string

  @IsOptional()
  @IsString()
  code?: string
}
