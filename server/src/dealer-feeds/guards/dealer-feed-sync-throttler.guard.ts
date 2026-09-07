import { Injectable } from '@nestjs/common'
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler'

// Рейт-лимит на ручной запуск синхронизации ("Обновить сейчас" в личном
// кабинете дилера) — без него можно было бы дёргать эндпоинт хоть каждую
// секунду, устраивая DoS собственному серверу дилера (мы качаем ЕГО фид)
// и нашему S3/DaData. Трекаем по userId, тот же приём, что и в
// AdPhoneThrottlerGuard (см. подробный комментарий там) — эндпоинт уже за
// AuthGuard, request.user гарантированно заполнен.
@Injectable()
export class DealerFeedSyncThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId: string | undefined = req.user?.id
    return userId ? `user:${userId}` : (req.ip as string)
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('Синхронизация уже запускалась недавно. Попробуйте через несколько минут')
  }
}
