import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

// Создание аккаунта продавцу вручную администратором, минуя подтверждение
// звонком через Zvonok — см. UserService.createVerifiedByAdmin. Реальный
// сценарий: продавец согласился, что аккаунт заводит администратор
// (например, по телефону/на встрече), не хочет проходить звонок сам.
export class AdminCreateVerifiedUserDto {
  @IsString({ message: 'Телефон должен быть строкой.' })
  @IsNotEmpty({ message: 'Телефон обязателен для заполнения.' })
  phone!: string

  @IsString({ message: 'Пароль должен быть строкой.' })
  @IsNotEmpty({ message: 'Пароль обязателен для заполнения.' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов.' })
  password!: string

  @IsOptional()
  @IsString({ message: 'Имя должно быть строкой.' })
  displayName?: string
}
