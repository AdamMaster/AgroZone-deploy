import { Injectable, Logger } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'
import { RedisService } from '@/redis/redis.service'

import {
  SITE_FLAG_DEFAULTS,
  SITE_FLAG_KEYS,
  SITE_SETTINGS_CACHE_KEY,
  SITE_SETTINGS_CACHE_TTL_SECONDS,
  SITE_SETTINGS_HISTORY_LIMIT,
  SiteFlagKey
} from './constants/site-flags.constants'
import type { AdminSiteFlag, AdminSiteSettings, SiteFlags, SiteSettingActor } from './site-settings.types'

// Только id и имя администратора — остальные поля User (телефон, почта,
// пароль и т.д.) в ответ админки попадать не должны.
const ACTOR_SELECT = { id: true, displayName: true } as const

const isSiteFlagKey = (key: string): key is SiteFlagKey => (SITE_FLAG_KEYS as string[]).includes(key)

interface SettingRow {
  key: string
  value: boolean
}

interface AdminSettingRow extends SettingRow {
  updatedAt: Date
  updatedBy: SiteSettingActor | null
}

@Injectable()
export class SiteSettingsService {
  private readonly logger = new Logger(SiteSettingsService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService
  ) {}

  // Значения всех флагов для сайта и приложения. Идёт из Redis; база читается
  // только при промахе кеша. Сбой Redis не ломает ответ — просто
  // читаем из базы, как будто кеша нет (см. readCache/writeCache).
  async getFlags(): Promise<SiteFlags> {
    const cached = await this.readCache()

    if (cached) return cached

    const rows = await this.prismaService.siteSetting.findMany({ select: { key: true, value: true } })
    const flags = this.applyOverrides(rows)

    await this.writeCache(flags)

    return flags
  }

  // Данные для страницы «Настройки» в админке. Кеш намеренно не
  // используется: администратор должен видеть то, что реально записано в
  // базе, сразу после своего изменения.
  async getAdminSettings(): Promise<AdminSiteSettings> {
    const [rows, changes] = await Promise.all([
      this.prismaService.siteSetting.findMany({
        select: { key: true, value: true, updatedAt: true, updatedBy: { select: ACTOR_SELECT } }
      }),
      this.prismaService.siteSettingChange.findMany({
        orderBy: { createdAt: 'desc' },
        take: SITE_SETTINGS_HISTORY_LIMIT,
        select: { id: true, key: true, value: true, createdAt: true, changedBy: { select: ACTOR_SELECT } }
      })
    ])

    const rowsByKey = new Map(rows.map(row => [row.key, row]))

    return {
      flags: SITE_FLAG_KEYS.map(key => this.toAdminFlag(key, rowsByKey.get(key) ?? null)),
      // Записи о флагах, которых уже нет в реестре (удалены из кода),
      // в историю не выводим — показывать их нечем.
      changes: changes.flatMap(change => (isSiteFlagKey(change.key) ? [{ ...change, key: change.key }] : []))
    }
  }

  // Включить или выключить флаг. Повторная установка того же значения —
  // не изменение: ничего не пишем, в журнал запись не попадает.
  async update(key: SiteFlagKey, value: boolean, adminId: string): Promise<AdminSiteFlag> {
    const current = await this.prismaService.siteSetting.findUnique({ where: { key }, select: { value: true } })
    const currentValue = current?.value ?? SITE_FLAG_DEFAULTS[key]

    if (currentValue !== value) {
      // Переопределение и запись в журнал — одной транзакцией: иначе
      // возможна история, не совпадающая с реальным состоянием флага.
      await this.prismaService.$transaction([
        this.prismaService.siteSetting.upsert({
          where: { key },
          create: { key, value, updatedById: adminId },
          update: { value, updatedById: adminId }
        }),
        this.prismaService.siteSettingChange.create({ data: { key, value, changedById: adminId } })
      ])

      await this.invalidateCache()
    }

    const row = await this.prismaService.siteSetting.findUnique({
      where: { key },
      select: { key: true, value: true, updatedAt: true, updatedBy: { select: ACTOR_SELECT } }
    })

    return this.toAdminFlag(key, row)
  }

  // Значение по умолчанию + то, что переопределено в базе. Ключи, которых
  // нет в реестре (флаг удалили из кода, а строка осталась), игнорируются.
  private applyOverrides(rows: SettingRow[]): SiteFlags {
    const flags: SiteFlags = { ...SITE_FLAG_DEFAULTS }

    for (const row of rows) {
      if (isSiteFlagKey(row.key)) flags[row.key] = row.value
    }

    return flags
  }

  private toAdminFlag(key: SiteFlagKey, row: AdminSettingRow | null): AdminSiteFlag {
    return {
      key,
      value: row?.value ?? SITE_FLAG_DEFAULTS[key],
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null
    }
  }

  // Кеш — оптимизация, а не источник правды: любая его ошибка (Redis
  // недоступен, в ключе мусор) означает «кеша нет», но не ошибку запроса.
  private async readCache(): Promise<SiteFlags | null> {
    try {
      const raw = await this.redisService.get(SITE_SETTINGS_CACHE_KEY)

      if (!raw) return null

      const parsed: unknown = JSON.parse(raw)

      if (typeof parsed !== 'object' || parsed === null) return null

      // Через applyOverrides, а не «как есть»: после выкладки с новым флагом
      // в кеше ещё лежит старый набор — недостающие флаги добираются из
      // значений по умолчанию, а не становятся undefined.
      return this.applyOverrides(
        Object.entries(parsed).flatMap(([key, value]) => (typeof value === 'boolean' ? [{ key, value }] : []))
      )
    } catch (error) {
      this.logger.warn(`Не удалось прочитать настройки сайта из кеша: ${(error as Error).message}`)

      return null
    }
  }

  private async writeCache(flags: SiteFlags): Promise<void> {
    try {
      await this.redisService.set(SITE_SETTINGS_CACHE_KEY, flags, SITE_SETTINGS_CACHE_TTL_SECONDS)
    } catch (error) {
      this.logger.warn(`Не удалось записать настройки сайта в кеш: ${(error as Error).message}`)
    }
  }

  // Сбой сброса не откатывает уже сохранённое изменение: устаревшее
  // значение доживёт в кеше не дольше SITE_SETTINGS_CACHE_TTL_SECONDS. В лог
  // пишем error, чтобы такой случай не прошёл незамеченным.
  private async invalidateCache(): Promise<void> {
    try {
      await this.redisService.del(SITE_SETTINGS_CACHE_KEY)
    } catch (error) {
      this.logger.error(
        `Не удалось сбросить кеш настроек сайта: старые значения будут отдаваться до ${SITE_SETTINGS_CACHE_TTL_SECONDS} с`,
        (error as Error).stack
      )
    }
  }
}
