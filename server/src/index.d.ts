import 'express-session'
import { User, UserRole } from '@/generated/prisma/client'
import { SupportParticipant } from '@/support/types/support-participant.type'

declare module 'express-session' {
  interface SessionData {
    userId: string
    userRole: UserRole
  }
}

declare global {
  namespace Express {
    interface Request {
      user: User
      // Проставляется SupportIdentityGuard — кто пишет в поддержку в этом
      // запросе, юзер или гость (см. support-participant.type.ts).
      // Опционально: вне support-роутов guard не отрабатывает, поля нет.
      supportParticipant?: SupportParticipant
    }
  }
}

export {}
