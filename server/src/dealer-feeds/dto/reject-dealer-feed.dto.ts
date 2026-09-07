import { IsNotEmpty, IsString } from 'class-validator'

export class RejectDealerFeedDto {
  @IsString()
  @IsNotEmpty({ message: 'Укажите причину отклонения — дилер увидит её в личном кабинете' })
  reason!: string
}
