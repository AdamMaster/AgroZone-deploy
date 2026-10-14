import { IMessageDraft } from '../types/message.types'

// Сообщение уходит на сервер как multipart/form-data: текст в поле text, фото
// — в поле files (см. ConversationsController). Ссылки на фото выдаёт сервер.
export const buildMessageFormData = ({ text, photos }: IMessageDraft, fields: Record<string, string> = {}) => {
  const formData = new FormData()

  Object.entries(fields).forEach(([name, value]) => formData.append(name, value))

  if (text) formData.append('text', text)

  photos.forEach(photo => formData.append('files', photo))

  return formData
}
