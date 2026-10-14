import { IsOptional, IsString, MaxLength } from 'class-validator'

// Сообщение приходит как multipart/form-data (или JSON, если фото нет): текст
// в поле text, фото — в поле files. Ссылки на вложения клиент не присылает:
// их выдаёт сервер после загрузки файлов, иначе в чужой диалог можно было бы
// подсунуть произвольный URL. Текст необязателен, если есть хотя бы одно фото
// — это проверяет ConversationsService.
export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string
}
