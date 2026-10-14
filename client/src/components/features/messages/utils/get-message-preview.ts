import { IMessage } from '../types/message.types'

// Короткая подпись сообщения для списка диалогов: текст, а у сообщения только
// с фото — «Фото».
export const getMessagePreview = ({ text, attachments }: Pick<IMessage, 'text' | 'attachments'>) =>
  text.trim() || (attachments.length > 0 ? 'Фото' : '')
