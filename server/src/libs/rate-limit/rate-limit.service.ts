import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '@/redis/redis.service'

export interface RateLimitResult {
  allowed: boolean
  count: number
}

// Счётчики «не больше N действий за окно» в Redis — для лимитов, которые
// нельзя повесить на IP (ThrottlerGuard считает по IP): например, «не
// больше 3 писем на сброс пароля на один адрес в час». Атакующий с
// ротацией IP обходит лимит по IP, но почтовый ящик жертвы у него один.
//
// Fail-open: если Redis недоступен, действие разрешается. Лимит — защита
// от злоупотребления, а не бизнес-правило; из-за упавшего Redis нельзя
// запирать пользователей и ломать восстановление пароля.
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name)

  constructor(private readonly redis: RedisService) {}

  async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const redisKey = `rl:${key}`

    try {
      const client = this.redis.getClient()
      const count = await client.incr(redisKey)

      // Окно ставим только на первом попадании — фиксированное окно от
      // первого действия, а не скользящее, которое бы продлевалось на
      // каждой попытке и никогда не заканчивалось у настойчивого клиента.
      if (count === 1) {
        await client.expire(redisKey, windowSeconds)
      } else if (count > limit && (await client.ttl(redisKey)) < 0) {
        // Ключ без TTL (сбой между INCR и EXPIRE) — иначе он заблокировал бы навсегда.
        await client.expire(redisKey, windowSeconds)
      }

      return { allowed: count <= limit, count }
    } catch (error) {
      this.logger.warn(`Redis недоступен, лимит "${key}" пропущен: ${(error as Error).message}`)
      return { allowed: true, count: 0 }
    }
  }
}
