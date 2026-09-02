import { IsNotEmpty } from 'class-validator'

export class PhoneChangeDto {
  @IsNotEmpty({ message: 'Номер телефона обязателен для заполнения' })
  newPhone!: string
}
