import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Matches } from 'class-validator'
import { UserType } from '@/generated/prisma/enums'

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Имя должно быть строкой.' })
  name?: string

  @IsOptional()
  @IsString({ message: 'Email должен быть строкой.' })
  @IsEmail({}, { message: 'Некорректный формат email.' })
  email?: string

  @IsOptional()
  @IsBoolean({ message: 'isTwoFactorEnabled должно быть булевым значением.' })
  isTwoFactorEnabled?: boolean

  // Письма о новых сообщениях в чате (переключатель в настройках). Служебные
  // письма (пароль, подтверждение почты, модерация) он не отключает.
  @IsOptional()
  @IsBoolean({ message: 'chatEmailNotifications должно быть булевым значением.' })
  chatEmailNotifications?: boolean

  // Частное лицо / ИП / компания — чисто информационная метка на карточке
  // продавца, без привязанных к ней привилегий на площадке.
  @IsOptional()
  @IsEnum(UserType, { message: 'Некорректный тип продавца.' })
  type?: UserType
}
