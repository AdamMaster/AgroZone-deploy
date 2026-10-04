import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { Prisma } from '@/generated/prisma/client'
import { SecurityEventActor, SecurityEventType, UserRole } from '@/generated/prisma/enums'
import { PrismaService } from '@/prisma/prisma.service'

import {
  SECURITY_EVENTS_DEFAULT_PAGE_SIZE,
  SECURITY_EVENTS_DEFAULT_RETENTION_DAYS,
  SECURITY_EVENTS_MAX_PAGE_SIZE,
  SECURITY_EVENTS_MAX_USER_AGENT_LENGTH,
  SECURITY_EVENTS_PURGE_BATCH_SIZE
} from './constants/security-events.constants'
import { FindSecurityEventsQueryDto } from './dto/find-security-events-query.dto'
import { getRequestMeta, RequestMeta } from './request-context'
import { describeUserAgent } from './utils/describe-user-agent.util'

// Только плоские значения: metadata попадает в JSON-колонку и в ответ API,
// вложенные структуры там ни к чему. Контакты передавайте уже
// маскированными (maskEmail/maskPhone) — сервис их не маскирует сам, чтобы
// случайно не записать полный адрес из-за забытого вызова было нельзя
// "по умолчанию" незаметно: см. комментарий у модели UserSecurityEvent.
export type SecurityEventMetadata = Record<string, string | number | boolean | null>

// email — вход по ссылке подтверждения из письма (см. EmailConfirmationService).
export type LoginMethod = 'password' | 'sms' | 'oauth' | 'email'

export interface RecordSecurityEventInput {
  userId: string
  type: SecurityEventType
  metadata?: SecurityEventMetadata
  // Явно задать актора. Обычно НЕ нужно — по умолчанию определяется сам
  // (см. resolveActor). Нужен для действий без человека, например
  // автоповышение роли по ADMIN_EMAILS — там запрос формально есть (это
  // вход пользователя), но роль выдал не он, а система.
  actor?: SecurityEventActor
}

// Запись, как она отдаётся пользователю в его собственных настройках —
// без User-Agent целиком и без id администратора (пользователю достаточно
// знать, что действие совершил "администратор", а кто именно — внутренняя
// информация).
export interface SecurityEventForUser {
  id: string
  type: SecurityEventType
  actor: SecurityEventActor
  ip: string | null
  device: string | null
  metadata: Prisma.JsonValue | null
  createdAt: Date
}

export interface SecurityEventForAdmin extends SecurityEventForUser {
  userAgent: string | null
  actorId: string | null
  // Имя администратора, совершившего действие (null — не ADMIN-событие или
  // аккаунт админа уже не найден).
  actorName: string | null
}

export interface SecurityEventsPage<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

@Injectable()
export class SecurityEventsService {
  private readonly logger = new Logger(SecurityEventsService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService
  ) {}

  // Записать событие безопасности. НИКОГДА не бросает исключение наружу:
  // журнал вспомогательный, и сбой записи в него (например, временно
  // недоступна база) не должен откатывать или ломать само действие
  // пользователя — смену пароля, вход и т.д. Ошибка попадает в лог
  // сервера, по нему видно, что запись потерялась.
  //
  // Осознанный компромисс: запись идёт ПОСЛЕ основного действия отдельным
  // запросом, а не в одной транзакции с ним. Строгая атомарность означала
  // бы, что любой сбой журнала блокирует, например, вход пользователя, —
  // для журнала расследований это неправильный приоритет.
  async record(input: RecordSecurityEventInput): Promise<void> {
    try {
      const meta = getRequestMeta()
      const { actor, actorId } = this.resolveActor(input, meta)

      await this.prismaService.userSecurityEvent.create({
        data: {
          userId: input.userId,
          type: input.type,
          actor,
          actorId,
          ip: meta?.ip ?? null,
          userAgent: meta?.userAgent ? meta.userAgent.slice(0, SECURITY_EVENTS_MAX_USER_AGENT_LENGTH) : null,
          device: describeUserAgent(meta?.userAgent),
          ...(input.metadata && { metadata: input.metadata })
        }
      })
    } catch (error) {
      this.logger.error(
        `Не удалось записать событие безопасности ${input.type} для пользователя ${input.userId}`,
        error instanceof Error ? error.stack : String(error)
      )
    }
  }

  // Вход фиксируем не всегда, а только если пользователь входит с
  // неизвестной нам комбинации IP + устройство. Журнал каждого входа
  // раздул бы таблицу и утопил в шуме важные события; а вот вход с нового
  // места — как раз то, что нужно увидеть при подозрении на взлом.
  // Регистрация (ACCOUNT_REGISTERED) считается "уже виденным" местом:
  // сразу после регистрации идёт автоматический вход с того же IP/устройства,
  // и второй записи для него не нужно.
  async recordLoginIfNew(userId: string, method: LoginMethod): Promise<void> {
    try {
      const meta = getRequestMeta()

      if (!meta) {
        return
      }

      const device = describeUserAgent(meta.userAgent)

      // Без IP и без устройства отпечатка нет — сравнивать не с чем, а
      // записывать "вход непонятно откуда" при каждом входе бессмысленно.
      if (!meta.ip && !device) {
        return
      }

      const seen = await this.prismaService.userSecurityEvent.findFirst({
        where: {
          userId,
          type: { in: [SecurityEventType.LOGIN_NEW_DEVICE, SecurityEventType.ACCOUNT_REGISTERED] },
          ip: meta.ip,
          device
        },
        select: { id: true }
      })

      if (seen) {
        return
      }

      await this.record({ userId, type: SecurityEventType.LOGIN_NEW_DEVICE, metadata: { method } })
    } catch (error) {
      this.logger.error(
        `Не удалось проверить новый вход для пользователя ${userId}`,
        error instanceof Error ? error.stack : String(error)
      )
    }
  }

  async findForAdmin(
    userId: string,
    query: FindSecurityEventsQueryDto
  ): Promise<SecurityEventsPage<SecurityEventForAdmin>> {
    const user = await this.prismaService.user.findUnique({ where: { id: userId }, select: { id: true } })

    if (!user) {
      throw new NotFoundException('Пользователь не найден')
    }

    const { rows, total, page, limit } = await this.findPage(userId, query)

    // Имена администраторов — одним запросом на страницу, а не по запросу
    // на строку.
    const actorIds = [...new Set(rows.map(row => row.actorId).filter((id): id is string => Boolean(id)))]
    const actors = actorIds.length
      ? await this.prismaService.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, displayName: true }
        })
      : []
    const actorNames = new Map(actors.map(actor => [actor.id, actor.displayName]))

    return {
      items: rows.map(row => ({
        id: row.id,
        type: row.type,
        actor: row.actor,
        actorId: row.actorId,
        actorName: row.actorId ? (actorNames.get(row.actorId) ?? null) : null,
        ip: row.ip,
        userAgent: row.userAgent,
        device: row.device,
        metadata: row.metadata,
        createdAt: row.createdAt
      })),
      total,
      page,
      limit
    }
  }

  async findForUser(
    userId: string,
    query: FindSecurityEventsQueryDto
  ): Promise<SecurityEventsPage<SecurityEventForUser>> {
    const { rows, total, page, limit } = await this.findPage(userId, query)

    return {
      items: rows.map(row => ({
        id: row.id,
        type: row.type,
        actor: row.actor,
        ip: row.ip,
        device: row.device,
        metadata: row.metadata,
        createdAt: row.createdAt
      })),
      total,
      page,
      limit
    }
  }

  // Удаляет записи старше срока хранения (см. SECURITY_EVENTS_DEFAULT_RETENTION_DAYS).
  // Вызывается ночным воркером. Идёт пачками — не держит долгую блокировку
  // и не тянет в память все id разом. Возвращает, сколько записей удалено.
  async purgeExpired(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - this.getRetentionDays() * 24 * 60 * 60 * 1000)
    let deleted = 0

    for (;;) {
      const batch = await this.prismaService.userSecurityEvent.findMany({
        where: { createdAt: { lt: cutoff } },
        select: { id: true },
        take: SECURITY_EVENTS_PURGE_BATCH_SIZE
      })

      if (batch.length === 0) {
        break
      }

      const { count } = await this.prismaService.userSecurityEvent.deleteMany({
        where: { id: { in: batch.map(row => row.id) } }
      })
      deleted += count

      if (batch.length < SECURITY_EVENTS_PURGE_BATCH_SIZE) {
        break
      }
    }

    return deleted
  }

  getRetentionDays(): number {
    const configured = Number(this.configService.get<string>('SECURITY_EVENTS_RETENTION_DAYS'))

    return Number.isFinite(configured) && configured > 0
      ? Math.floor(configured)
      : SECURITY_EVENTS_DEFAULT_RETENTION_DAYS
  }

  private async findPage(userId: string, query: FindSecurityEventsQueryDto) {
    const page = query.page ?? 1
    const limit = Math.min(query.limit ?? SECURITY_EVENTS_DEFAULT_PAGE_SIZE, SECURITY_EVENTS_MAX_PAGE_SIZE)

    const where: Prisma.UserSecurityEventWhereInput = {
      userId,
      ...(query.types?.length && { type: { in: query.types } })
    }

    const [rows, total] = await Promise.all([
      this.prismaService.userSecurityEvent.findMany({
        where,
        // id вторым ключом — события, записанные в одну миллисекунду (цепочка
        // "запрос смены email → подтверждение"), иначе могли бы
        // перемешиваться между страницами.
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prismaService.userSecurityEvent.count({ where })
    ])

    return { rows, total, page, limit }
  }

  // Кто совершил действие:
  // - нет HTTP-контекста (cron, скрипт) → SYSTEM;
  // - действует авторизованный ADMIN, а объект — ДРУГОЙ пользователь →
  //   ADMIN (+ id этого админа);
  // - иначе → USER (владелец аккаунта: сам вошёл, сам сменил пароль, или
  //   перешёл по ссылке из письма без сессии).
  private resolveActor(
    input: RecordSecurityEventInput,
    meta: RequestMeta | null
  ): { actor: SecurityEventActor; actorId: string | null } {
    if (input.actor) {
      return {
        actor: input.actor,
        actorId: input.actor === SecurityEventActor.ADMIN ? (meta?.actingUserId ?? null) : null
      }
    }

    if (!meta) {
      return { actor: SecurityEventActor.SYSTEM, actorId: null }
    }

    if (meta.actingUserId && meta.actingUserId !== input.userId && meta.actingUserRole === UserRole.ADMIN) {
      return { actor: SecurityEventActor.ADMIN, actorId: meta.actingUserId }
    }

    return { actor: SecurityEventActor.USER, actorId: null }
  }
}
