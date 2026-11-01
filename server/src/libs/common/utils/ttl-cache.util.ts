interface TtlCacheOptions<T> {
  // Сколько миллисекунд значение считается свежим.
  ttlMs: number
  // Загрузка значения (обычно запрос к базе).
  load: () => Promise<T>
  // Сохранять ли результат. Например, пустой список категорий (база в этот
  // момент пересоздаётся) кэшировать нельзя — иначе сайт показывал бы пустое
  // меню весь срок жизни кэша.
  shouldCache?: (value: T) => boolean
  now?: () => number
}

// Значение в памяти процесса с ограниченным сроком жизни — для справочников,
// которые читаются на каждом запросе, а меняются редко (дерево категорий,
// список локаций). Сервер работает одним процессом, поэтому общий кэш в Redis
// не нужен.
//
// Одновременные запросы при пустом кэше ждут одну и ту же загрузку, а не
// идут в базу каждый сам. Если загрузка упала, а прежнее значение есть,
// отдаём прежнее (лучше чуть устаревший справочник, чем ошибка на всём
// сайте), и следующий запрос попробует загрузить снова.
//
// Отдаётся один и тот же объект всем вызывающим — менять его нельзя.
export class TtlCache<T> {
  private entry: { value: T; expiresAt: number } | undefined
  private pending: Promise<T> | undefined
  private readonly now: () => number

  constructor(private readonly options: TtlCacheOptions<T>) {
    this.now = options.now ?? Date.now
  }

  async get(): Promise<T> {
    if (this.entry && this.entry.expiresAt > this.now()) {
      return this.entry.value
    }

    this.pending ??= this.refresh().finally(() => {
      this.pending = undefined
    })

    return this.pending
  }

  // Сбросить значение: следующий get() загрузит заново.
  invalidate(): void {
    this.entry = undefined
  }

  private async refresh(): Promise<T> {
    try {
      const value = await this.options.load()

      if (this.options.shouldCache?.(value) ?? true) {
        this.entry = { value, expiresAt: this.now() + this.options.ttlMs }
      }

      return value
    } catch (error) {
      if (this.entry) {
        return this.entry.value
      }

      throw error
    }
  }
}
