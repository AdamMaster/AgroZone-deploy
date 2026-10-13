import { IMessage } from '../types/message.types'

// Новое сообщение — в конец истории. Одно и то же может прийти дважды: ответом
// на отправку и эхом сокета (в любом порядке), поэтому уже известное не
// добавляем.
export const appendMessage = (messages: IMessage[] | undefined, message: IMessage): IMessage[] => {
  if (!messages) return [message]

  return messages.some(existing => existing.id === message.id) ? messages : [...messages, message]
}
