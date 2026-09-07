import { IsNotEmpty, IsString, IsUrl } from 'class-validator'

export class SubmitDealerFeedDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'Укажите корректную ссылку на XML-фид' })
  url!: string
}
