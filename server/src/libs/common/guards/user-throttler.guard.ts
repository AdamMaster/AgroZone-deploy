import { ThrottlerGuard } from '@nestjs/throttler'

// Лимит запросов на аккаунт, а не на IP (так по умолчанию работает
// ThrottlerGuard): за мобильным оператором или офисом один адрес у многих людей,
// а смена IP не должна давать обход, пока используется тот же аккаунт.
// request.user на момент проверки уже заполнен, только если AuthGuard стоит в
// @UseGuards раньше; без него считаем по IP.
export abstract class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId: string | undefined = req.user?.id

    return userId ? `user:${userId}` : (req.ip as string)
  }
}
