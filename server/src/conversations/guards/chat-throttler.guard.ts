import { Injectable } from '@nestjs/common'
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler'

// Рейт-лимит на создание диалогов и отправку сообщений. Считаем по
// аккаунту, а не по IP (как AdPhoneThrottlerGuard): в мобильных сетях за
// одним адресом сидят тысячи людей, а лимит нужен против одного аккаунта,
// который заваливает продавцов или собеседника. Подключается после
// AuthGuard (он кладёт пользователя в request), сами лимиты — в
// constants/conversations.constants.ts.
@Injectable()
export class ChatThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId: string | undefined = req.user?.id
    return userId ? `user:${userId}` : (req.ip as string)
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('Слишком много сообщений. Подождите немного и попробуйте снова')
  }
}
