import { join } from 'node:path'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { env, pipeline } from '@huggingface/transformers'

// Модель под семантический поиск категорий — крутится прямо на нашем
// сервере через ONNX (пакет @huggingface/transformers), никуда наружу не
// стучится при инференсе (только один раз качает веса с Hugging Face при
// первом запуске/на новом окружении), поэтому бесплатно и не зависит от
// блокировок внешних AI-провайдеров в России (отказались от GigaChat/
// Яндекса для эмбеддингов именно из-за этого — GigaChat остался только для
// офлайн-обогащения синонимов, см. GigaChatService).
//
// Раньше здесь стояла Xenova/multilingual-e5-base — мультиязычная модель
// на 100+ языков. Нам мультиязычность не нужна вообще (только русский, см.
// обсуждение с пользователем), а часть "грузоподъёмности" универсальной
// модели уходит на языки, которые никогда не встретятся в поиске — заменили
// на deepvk/USER2-base: модель, обученная С НУЛЯ только на русском
// (архитектура RuModernBERT). На бенчмарке ruMTEB она заметно точнее
// (61.12 против 58.34 у e5-base) и при этом МЕНЬШЕ (149M параметров против
// ~278M у e5-base) — то есть и умнее, и быстрее на том же CPU.
//
// ВАЖНО при следующей смене модели: векторы разных моделей лежат в разных
// пространствах и НЕ сравнимы между собой. После смены MODEL_NAME нужно
// пересчитать вообще все термины (npm run embeddings:precompute -- --force)
// — старые записи в CategoryTerm станут мусором, сравнение с ними даст
// случайные (не значащие) числа. См. также CategoriesService.minScore/
// lexicalBoostWeight — у каждой модели свой диапазон косинусных близостей,
// эти пороги тоже требуют пересмотра под новую модель (см.
// scripts/test-search-quality.ts).
//
// У модели асимметричная схема "запрос/документ" — не отдельные модели, а
// текстовый префикс перед одной и той же моделью: "search_document: " для
// того, что индексируем (категории), "search_query: " для того, что ищем
// (ввод пользователя). См. getCategoryEmbedding(s)/getQueryEmbedding ниже —
// перепутать префиксы легко и результат от этого заметно хуже, так что не
// убирать.
const MODEL_NAME = 'deepvk/USER2-base'

@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingsService.name)
  // Тип пайплайна не выносим отдельно — держим any: библиотека сама не
  // экспортирует стабильное имя типа под конкретно feature-extraction
  // пайплайн, а гадать и на ходу подгонять сигнатуру смысла нет.
  private extractor: any = null
  private loadingPromise: Promise<any> | null = null

  async onModuleInit() {
    // Прогреваем модель сразу при старте сервера — иначе первый же поиск
    // категории после деплоя/рестарта будет ждать несколько секунд, пока
    // модель скачается (при самом первом запуске) или загрузится в память
    // из уже скачанного кэша на диске.
    await this.getExtractor()

    this.logger.log(`Модель эмбеддингов (${MODEL_NAME}) загружена и готова`)
  }

  /** Эмбеддинги категорий — для precompute-скрипта, можно сразу пачкой. */
  async getCategoryEmbeddings(texts: string[]): Promise<number[][]> {
    return this.embed(texts.map(text => `search_document: ${text}`))
  }

  async getCategoryEmbedding(text: string): Promise<number[]> {
    const [vector] = await this.getCategoryEmbeddings([text])

    return vector
  }

  /** Эмбеддинг поискового запроса пользователя — для живого поиска. */
  async getQueryEmbedding(text: string): Promise<number[]> {
    const [vector] = await this.embed([`search_query: ${text}`])

    return vector
  }

  private async embed(prefixedTexts: string[]): Promise<number[][]> {
    if (prefixedTexts.length === 0) return []

    const extractor = await this.getExtractor()

    const output = await extractor(prefixedTexts, { pooling: 'mean', normalize: true })

    return output.tolist() as number[][]
  }

  private async getExtractor(): Promise<any> {
    if (this.extractor) return this.extractor

    if (!this.loadingPromise) {
      // Сама модель (несколько сотен мегабайт ONNX-весов) качается и
      // кэшируется на диск при самом первом запуске, дальше уже
      // переиспользуется из кэша — не с нуля при каждом рестарте сервера.
      // Кэш держим в проекте, а не внутри node_modules, чтобы не потерять
      // его при переустановке зависимостей (см. .gitignore — сам кэш в git
      // не кладём, слишком тяжёлый).
      //
      // ВАЖНО: это происходит внутри onModuleInit БЕЗ try/catch — если на
      // первом запуске с НОВОЙ моделью (deepvk/USER2-base ещё ни разу не
      // скачивалась на этом окружении) Hugging Face окажется недоступен,
      // pipeline() бросит исключение, и Nest не поднимет приложение вообще
      // (а не просто деградирует поиск категорий) — сервер не запустится
      // целиком, пока сеть не восстановится. Так было и раньше с e5-base
      // (риск не новый), но раньше кэш уже был тёплым на проде — на СВЕЖЕМ
      // окружении с новой моделью риск реален заново на первом же старте.
      env.cacheDir = join(process.cwd(), '.cache', 'transformers')

      // Модель качается напрямую с Hugging Face, а доступ к нему из России
      // нестабильный (см. обсуждение с пользователем) — логируем прогресс,
      // чтобы по консоли было видно "качается, столько-то %", а не гадать,
      // завис процесс или просто медленно тянет.
      this.loadingPromise = pipeline('feature-extraction', MODEL_NAME, {
        progress_callback: (progress: any) => {
          if (progress?.status === 'progress') {
            const percent = Math.round(progress.progress ?? 0)

            this.logger.log(`Скачивание модели эмбеддингов: ${progress.file} — ${percent}%`)
          } else if (progress?.status === 'done') {
            this.logger.log(`Файл модели готов: ${progress.file}`)
          }
        }
      })
    }

    this.extractor = await this.loadingPromise

    return this.extractor
  }
}
