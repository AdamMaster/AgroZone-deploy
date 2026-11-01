import { IsNotEmpty, IsString } from 'class-validator'

import { NormalizeLoginIdentifier } from '@/libs/common/decorators/normalize-email.decorator'

export class CheckUserDto {
  @IsNotEmpty({ message: 'Введите Email или номер телефона' })
  @IsString({ message: 'Идентификатор должен быть строкой' })
  @NormalizeLoginIdentifier()
  identifier!: string
}
