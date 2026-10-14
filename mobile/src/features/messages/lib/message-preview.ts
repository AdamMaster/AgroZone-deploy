import type { ChatMessage } from '../types/message.types'

// Подпись сообщения для списка диалогов: текст, а у сообщения только с
// фото — «Фото» (как getMessagePreview сайта).
export const getMessagePreview = ({ text, attachments }: Pick<ChatMessage, 'text' | 'attachments'>) =>
  text.trim() || (attachments.length > 0 ? 'Фото' : '')
