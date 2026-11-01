import { IsPasswordsMatchingConstraint } from '@/libs/common/decorators/is-passwords-matching-constraint.decorator'

import { Equals, IsBoolean, IsEmail, IsNotEmpty, IsString, Matches, MinLength, Validate } from 'class-validator'

import { NormalizeEmail } from '@/libs/common/decorators/normalize-email.decorator'

export class RegisterDto {
  @IsString({ message: 'Имя должно быть строкой.' })
  @IsNotEmpty({ message: 'Имя обязательно для заполнения.' })
  name!: string

  // Регистрация здесь — только по почте: войти можно лишь после подтверждения
  // письмом. Телефон в этом запросе не принимается (forbidNonWhitelisted
  // ответит 400): раньше аккаунт с чужой почтой и своим телефоном можно было
  // «подтвердить» звонком, и чужая почта считалась подтверждённой. Регистрация
  // по телефону — отдельный путь (auth/register/sms/*).
  @IsString({ message: 'Email должен быть строкой.' })
  @IsNotEmpty({ message: 'Email обязателен для заполнения.' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'Некорректный формат email.' })
  email!: string

  @IsString({ message: 'Пароль должен быть строкой.' })
  @IsNotEmpty({ message: 'Пароль обязателен для заполнения.' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  password!: string

  @IsString({ message: 'Пароль подтверждения должен быть строкой.' })
  @IsNotEmpty({ message: 'Поле подтверждения пароля не может быть пустым.' })
  @MinLength(6, { message: 'Пароль подтверждения должен содержать не менее 6 символов.' })
  @Validate(IsPasswordsMatchingConstraint, { message: 'Пароли не совпадают.' })
  passwordRepeat!: string

  @IsBoolean({ message: 'Согласие на обработку персональных данных указано некорректно.' })
  @Equals(true, { message: 'Необходимо дать согласие на обработку персональных данных.' })
  personalDataConsent!: boolean
}
