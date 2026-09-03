import { SupportGuest, User } from '@/generated/prisma/client'

// Кто на другом конце SUPPORT-диалога: либо залогиненный User, либо
// анонимный SupportGuest (см. schema.prisma и SupportIdentityGuard) — но не
// оба сразу. Держим это как discriminated union, а не два опциональных
// поля, чтобы TypeScript сам заставлял разбирать оба случая везде, где это
// важно (например, в какое поле Conversation/Message писать
// buyerId/senderId против guestId/senderGuestId).
export type SupportParticipant = { type: 'user'; user: User } | { type: 'guest'; guest: SupportGuest }
