import { IsNotEmpty, IsString } from 'class-validator'

export class PhoneResetDto {
  @IsString({ message: 'Номер телефона должен быть строкой.' })
  @IsNotEmpty({ message: 'Укажите номер телефона.' })
  phone!: string
}
