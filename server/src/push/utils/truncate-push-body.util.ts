import { PUSH_BODY_MAX_LENGTH } from '../constants/push.constants'

// Текст в уведомлении: длинное система всё равно обрежет, а лишнее незачем
// гонять через FCM и RuStore.
export function truncatePushBody(text: string, maxLength: number = PUSH_BODY_MAX_LENGTH): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}
