import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class SmsRegisterDto {
  @IsString({ message: 'Номер телефона должен быть строкой.' })
  @IsNotEmpty({ message: 'Укажите номер телефона.' })
  phone!: string
}
