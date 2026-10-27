import {
  SELLER_REVIEW_CHAT_MIN_MESSAGES_PER_SIDE,
  SELLER_REVIEW_CONTACT_COOLDOWN_MS
} from '../constants/seller-reviews.constants'

// Сколько сообщений написала одна сторона диалога и когда первое.
export interface ChatSideStats {
  count: number
  firstAt: Date
}

export interface ChatStats {
  conversationId: string
  author: ChatSideStats | null
  seller: ChatSideStats | null
}

export interface ContactInput {
  chats: ChatStats[]
  // Когда автор впервые открыл телефон этого продавца (по любому объявлению).
  firstPhoneRevealAt: Date | null
  now: Date
}

// Контакт без подтверждения сделки: либо достаточная переписка, либо
// показанный телефон; в обоих случаях должна пройти выдержка. «ok» —
// отзыв можно оставлять (conversationId — диалог, давший право, у телефона
// его нет), «fresh» — контакт есть, но выдержка не прошла (availableAt —
// когда пройдёт), «none» — контакта нет.
export type ContactVerdict =
  | { status: 'ok'; conversationId: string | null }
  | { status: 'fresh'; availableAt: Date }
  | { status: 'none' }

interface Candidate {
  availableAt: Date
  conversationId: string | null
}

export function evaluateContact({ chats, firstPhoneRevealAt, now }: ContactInput): ContactVerdict {
  const candidates: Candidate[] = []

  for (const chat of chats) {
    const { author, seller } = chat

    // Выдержка отсчитывается от первого ответа продавца: до него диалог —
    // монолог покупателя, а не контакт.
    if (
      author &&
      seller &&
      author.count >= SELLER_REVIEW_CHAT_MIN_MESSAGES_PER_SIDE &&
      seller.count >= SELLER_REVIEW_CHAT_MIN_MESSAGES_PER_SIDE
    ) {
      candidates.push({
        availableAt: new Date(seller.firstAt.getTime() + SELLER_REVIEW_CONTACT_COOLDOWN_MS),
        conversationId: chat.conversationId
      })
    }
  }

  if (firstPhoneRevealAt) {
    candidates.push({
      availableAt: new Date(firstPhoneRevealAt.getTime() + SELLER_REVIEW_CONTACT_COOLDOWN_MS),
      conversationId: null
    })
  }

  if (candidates.length === 0) return { status: 'none' }

  const [earliest] = candidates.sort((a, b) => a.availableAt.getTime() - b.availableAt.getTime())

  return earliest.availableAt <= now
    ? { status: 'ok', conversationId: earliest.conversationId }
    : { status: 'fresh', availableAt: earliest.availableAt }
}
