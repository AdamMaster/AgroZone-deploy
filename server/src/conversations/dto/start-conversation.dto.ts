import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

// Диалог всегда начинает покупатель — по объявлению, к которому у него есть
// вопрос. Продавец инициировать через этот эндпоинт не может: он либо
// отвечает в уже существующем диалоге (см. SendMessageDto), либо диалога с
// ним пока просто нет (см. ConversationsService.startConversation).
// Формат тела и правило «текст или фото» — как у SendMessageDto.
export class StartConversationDto {
  @IsUUID()
  adId!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string
}
