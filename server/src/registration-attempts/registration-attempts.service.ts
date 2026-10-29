import { Injectable, Logger } from '@nestjs/common'

import { Prisma } from '@/generated/prisma/client'
import {
  RegistrationAttemptStatus,
  RegistrationAttemptStep,
  RegistrationChannel,
  RegistrationFailureReason,
  RegistrationPlatform
} from '@/generated/prisma/enums'
import { PrismaService } from '@/prisma/prisma.service'
import { getRequestHeader, getRequestMeta } from '@/security-events/request-context'
import { describeUserAgent } from '@/security-events/utils/describe-user-agent.util'

import {
  REGISTRATION_ATTEMPTS_PURGE_BATCH_SIZE,
  REGISTRATION_ATTEMPTS_RETENTION_DAYS,
  REGISTRATION_ATTEMPTS_SUMMARY_DAYS,
  REGISTRATION_ATTEMPT_ABANDON_AFTER_MS,
  REGISTRATION_ATTEMPT_MAX_DETAIL_LENGTH,
  REGISTRATION_ATTEMPT_MAX_USER_AGENT_LENGTH,
  REGISTRATION_ATTEMPT_REUSE_WINDOW_MS
} from './constants/registration-attempts.constants'
import { FindRegistrationAttemptsQueryDto } from './dto/find-registration-attempts-query.dto'

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Что видно в админке: к статусам базы добавлен ABANDONED — попытка «в
// процессе», которая давно не двигается (человек бросил регистрацию).
export type RegistrationAttemptDisplayStatus = RegistrationAttemptStatus | 'ABANDONED'

export interface RegistrationAttemptKey {
  channel: RegistrationChannel
  // Телефон в нормализованном виде (+7…) или email.
  contact: string
}

export interface RegistrationAttemptForAdmin {
  id: string
  channel: RegistrationChannel
  contact: string
  platform: RegistrationPlatform
  status: RegistrationAttemptDisplayStatus
  step: RegistrationAttemptStep
  failureReason: RegistrationFailureReason | null
  failureDetail: string | null
  failuresCount: number
  ip: string | null
  device: string | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
  // Попытка не завершена, но аккаунт с этим телефоном/почтой уже есть:
  // человек всё же зарегистрировался (другой попыткой или позже).
  registeredLater: boolean
}

export interface RegistrationAttemptsPage {
  items: RegistrationAttemptForAdmin[]
  total: number
  page: number
  limit: number
  // Сводка за последние дни — независимо от фильтров списка.
  summary: { days: number; total: number; completed: number; problems: number }
}

// Текст ошибки для failureDetail: только сообщение, без стека и без
// вложенных объектов, и не длиннее предела.
export function describeRegistrationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  return message.slice(0, REGISTRATION_ATTEMPT_MAX_DETAIL_LENGTH)
}

// Журнал попыток регистрации. Все методы записи (progress, fail, complete)
// НИКОГДА не бросают исключение: журнал вспомогательный, и его сбой не
// должен ломать саму регистрацию (как и у SecurityEventsService.record).
//
// Одна запись — одна попытка. Шаги и ошибки внутри неё обновляют ту же
// запись: «открытой» считается последняя не завершённая попытка по тому же
// каналу и контакту, обновлявшаяся не позже REUSE_WINDOW назад.
@Injectable()
export class RegistrationAttemptsService {
  private readonly logger = new Logger(RegistrationAttemptsService.name)

  constructor(private readonly prismaService: PrismaService) {}

  // Попытка дошла до очередного шага: человек ввёл данные, ему выдан номер
  // для звонка или отправлено письмо.
  async progress(key: RegistrationAttemptKey, step: RegistrationAttemptStep): Promise<void> {
    await this.safely('шаг', key, async () => {
      const open = await this.findOpen(key)

      if (open) {
        await this.prismaService.registrationAttempt.update({
          where: { id: open.id },
          data: { status: RegistrationAttemptStatus.IN_PROGRESS, step }
        })

        return
      }

      await this.prismaService.registrationAttempt.create({
        data: { ...this.newAttemptData(key), step, status: RegistrationAttemptStatus.IN_PROGRESS }
      })
    })
  }

  // Ошибка на попытке. createIfMissing=false — не заводить новую запись, если
  // открытой попытки нет: так ошибки обычного входа по звонку или чужих
  // ссылок не попадают в журнал регистраций.
  async fail(
    key: RegistrationAttemptKey,
    reason: RegistrationFailureReason,
    detail?: string,
    options: { createIfMissing?: boolean } = {}
  ): Promise<void> {
    const { createIfMissing = true } = options

    await this.safely('ошибку', key, async () => {
      const open = await this.findOpen(key)
      const failureDetail = detail ? detail.slice(0, REGISTRATION_ATTEMPT_MAX_DETAIL_LENGTH) : null

      if (open) {
        await this.prismaService.registrationAttempt.update({
          where: { id: open.id },
          data: {
            status: RegistrationAttemptStatus.FAILED,
            failureReason: reason,
            failureDetail,
            failuresCount: { increment: 1 }
          }
        })

        return
      }

      if (!createIfMissing) {
        return
      }

      await this.prismaService.registrationAttempt.create({
        data: {
          ...this.newAttemptData(key),
          status: RegistrationAttemptStatus.FAILED,
          failureReason: reason,
          failureDetail,
          failuresCount: 1
        }
      })
    })
  }

  // Регистрация завершена, аккаунт создан/подтверждён. createIfMissing=false
  // — только закрыть уже существующую попытку: подтверждение номера или почты
  // нужно и при обычном входе, а журналу регистраций они ни к чему.
  async complete(
    key: RegistrationAttemptKey,
    userId: string,
    options: { createIfMissing?: boolean } = {}
  ): Promise<void> {
    const { createIfMissing = true } = options

    await this.safely('завершение', key, async () => {
      const open = await this.findOpen(key)
      const completion = {
        status: RegistrationAttemptStatus.COMPLETED,
        step: RegistrationAttemptStep.COMPLETED,
        userId,
        completedAt: new Date()
      }

      if (open) {
        await this.prismaService.registrationAttempt.update({ where: { id: open.id }, data: completion })

        return
      }

      if (!createIfMissing) {
        return
      }

      await this.prismaService.registrationAttempt.create({ data: { ...this.newAttemptData(key), ...completion } })
    })
  }

  async findForAdmin(query: FindRegistrationAttemptsQueryDto, now = new Date()): Promise<RegistrationAttemptsPage> {
    const where = this.buildAdminWhere(query, now)
    const skip = (query.page - 1) * query.limit

    const [rows, total, summary] = await Promise.all([
      this.prismaService.registrationAttempt.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.limit
      }),
      this.prismaService.registrationAttempt.count({ where }),
      this.getSummary(now)
    ])

    const registered = await this.findRegisteredContacts(rows)
    const abandonBefore = this.abandonBefore(now)

    return {
      items: rows.map(row => ({
        id: row.id,
        channel: row.channel,
        contact: row.contact,
        platform: row.platform,
        status:
          row.status === RegistrationAttemptStatus.IN_PROGRESS && row.updatedAt < abandonBefore
            ? 'ABANDONED'
            : row.status,
        step: row.step,
        failureReason: row.failureReason,
        failureDetail: row.failureDetail,
        failuresCount: row.failuresCount,
        ip: row.ip,
        device: row.device,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        completedAt: row.completedAt,
        registeredLater:
          row.status !== RegistrationAttemptStatus.COMPLETED && registered.has(`${row.channel}:${row.contact}`)
      })),
      total,
      page: query.page,
      limit: query.limit,
      summary
    }
  }

  // Ночная очистка по сроку хранения. Возвращает, сколько записей удалено.
  async purgeExpired(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - REGISTRATION_ATTEMPTS_RETENTION_DAYS * MS_PER_DAY)
    let deleted = 0

    // Пачками, чтобы не держать долгую блокировку и не тянуть в память все id.
    for (;;) {
      const batch = await this.prismaService.registrationAttempt.findMany({
        where: { updatedAt: { lt: cutoff } },
        select: { id: true },
        take: REGISTRATION_ATTEMPTS_PURGE_BATCH_SIZE
      })

      if (batch.length === 0) {
        return deleted
      }

      const { count } = await this.prismaService.registrationAttempt.deleteMany({
        where: { id: { in: batch.map(row => row.id) } }
      })

      deleted += count

      if (batch.length < REGISTRATION_ATTEMPTS_PURGE_BATCH_SIZE) {
        return deleted
      }
    }
  }

  private async safely(what: string, key: RegistrationAttemptKey, action: () => Promise<void>): Promise<void> {
    try {
      await action()
    } catch (error) {
      this.logger.error(
        `Не удалось записать в журнал регистраций ${what} (${key.channel})`,
        error instanceof Error ? error.stack : String(error)
      )
    }
  }

  private normalizeKey(key: RegistrationAttemptKey): RegistrationAttemptKey {
    return {
      channel: key.channel,
      contact: key.channel === RegistrationChannel.EMAIL ? key.contact.trim().toLowerCase() : key.contact.trim()
    }
  }

  private findOpen(rawKey: RegistrationAttemptKey) {
    const key = this.normalizeKey(rawKey)

    return this.prismaService.registrationAttempt.findFirst({
      where: {
        channel: key.channel,
        contact: key.contact,
        status: { not: RegistrationAttemptStatus.COMPLETED },
        updatedAt: { gte: new Date(Date.now() - REGISTRATION_ATTEMPT_REUSE_WINDOW_MS) }
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true }
    })
  }

  // IP, устройство и платформа берутся из текущего HTTP-запроса. Приложение
  // отправляет X-Auth-Transport: token (см. mobile/src/lib/api/api-client.ts);
  // запрос без него, но с User-Agent — браузер.
  private newAttemptData(rawKey: RegistrationAttemptKey) {
    const key = this.normalizeKey(rawKey)
    const meta = getRequestMeta()

    const platform =
      getRequestHeader('x-auth-transport') === 'token'
        ? RegistrationPlatform.APP
        : meta?.userAgent
          ? RegistrationPlatform.SITE
          : RegistrationPlatform.UNKNOWN

    return {
      channel: key.channel,
      contact: key.contact,
      platform,
      ip: meta?.ip ?? null,
      userAgent: meta?.userAgent ? meta.userAgent.slice(0, REGISTRATION_ATTEMPT_MAX_USER_AGENT_LENGTH) : null,
      device: describeUserAgent(meta?.userAgent)
    }
  }

  private abandonBefore(now: Date): Date {
    return new Date(now.getTime() - REGISTRATION_ATTEMPT_ABANDON_AFTER_MS)
  }

  // «Проблемные» попытки: закончились ошибкой или брошены на полпути.
  private problemsWhere(now: Date): Prisma.RegistrationAttemptWhereInput {
    return {
      OR: [
        { status: RegistrationAttemptStatus.FAILED },
        { status: RegistrationAttemptStatus.IN_PROGRESS, updatedAt: { lt: this.abandonBefore(now) } }
      ]
    }
  }

  private buildAdminWhere(query: FindRegistrationAttemptsQueryDto, now: Date): Prisma.RegistrationAttemptWhereInput {
    const and: Prisma.RegistrationAttemptWhereInput[] = []

    if (query.filter === 'problems') {
      and.push(this.problemsWhere(now))
    } else if (query.filter === 'completed') {
      and.push({ status: RegistrationAttemptStatus.COMPLETED })
    }

    if (query.channel) {
      and.push({ channel: query.channel })
    }

    if (query.platform) {
      and.push({ platform: query.platform })
    }

    const search = query.search?.trim()

    if (search) {
      // Телефон ищем по цифрам: в базе он хранится как +7999…, а вводят с
      // пробелами и скобками.
      const isPhoneLike = /^[\d\s()+-]+$/.test(search)
      const needle = isPhoneLike ? search.replace(/\D/g, '') : search.toLowerCase()

      if (needle) {
        and.push({ contact: { contains: needle, mode: 'insensitive' } })
      }
    }

    return and.length ? { AND: and } : {}
  }

  private async getSummary(now: Date): Promise<RegistrationAttemptsPage['summary']> {
    const since = { gte: new Date(now.getTime() - REGISTRATION_ATTEMPTS_SUMMARY_DAYS * MS_PER_DAY) }

    const [total, completed, problems] = await Promise.all([
      this.prismaService.registrationAttempt.count({ where: { createdAt: since } }),
      this.prismaService.registrationAttempt.count({
        where: { createdAt: since, status: RegistrationAttemptStatus.COMPLETED }
      }),
      this.prismaService.registrationAttempt.count({ where: { createdAt: since, ...this.problemsWhere(now) } })
    ])

    return { days: REGISTRATION_ATTEMPTS_SUMMARY_DAYS, total, completed, problems }
  }

  // Какие из контактов страницы уже принадлежат существующим аккаунтам:
  // ключ «канал:контакт». Одним запросом на почты и одним на телефоны.
  private async findRegisteredContacts(
    rows: Array<{ channel: RegistrationChannel; contact: string; status: RegistrationAttemptStatus }>
  ): Promise<Set<string>> {
    const open = rows.filter(row => row.status !== RegistrationAttemptStatus.COMPLETED)
    const emails = open.filter(row => row.channel === RegistrationChannel.EMAIL).map(row => row.contact)
    const phones = open.filter(row => row.channel === RegistrationChannel.PHONE).map(row => row.contact)
    const registered = new Set<string>()

    const [users, userPhones] = await Promise.all([
      emails.length
        ? this.prismaService.user.findMany({
            where: { OR: emails.map(email => ({ email: { equals: email, mode: 'insensitive' as const } })) },
            select: { email: true }
          })
        : [],
      phones.length
        ? this.prismaService.userPhone.findMany({ where: { phone: { in: phones } }, select: { phone: true } })
        : []
    ])

    for (const user of users) {
      if (user.email) registered.add(`${RegistrationChannel.EMAIL}:${user.email.toLowerCase()}`)
    }

    for (const userPhone of userPhones) {
      registered.add(`${RegistrationChannel.PHONE}:${userPhone.phone}`)
    }

    return registered
  }
}
