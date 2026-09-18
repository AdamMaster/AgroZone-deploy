import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'

import { PriceUnit } from '@/generated/prisma/client'

// Ручная смена категории (вместе с характеристиками) ЛЮБОГО объявления
// администратором — см. AdsService.setCategoryByAdmin. features/unit
// опциональны: если админ открыл диалог и просто сменил категорию, ничего
// не дозаполняя (у новой категории нет обязательных полей или админ решил
// оставить их пустыми), клиент (AdminSetAdCategoryDialog) всё равно шлёт
// features явно — {} в том числе — так что на практике поле почти всегда
// присутствует. Опциональность тут — подстраховка для прямого вызова API в
// обход клиента: тогда AdsService.setCategoryByAdmin сам реконсилит текущие
// features объявления под новую категорию, а не считает их пустыми.
export class AdminSetAdCategoryDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string

  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>

  @IsOptional()
  @IsEnum(PriceUnit)
  unit?: PriceUnit
}
