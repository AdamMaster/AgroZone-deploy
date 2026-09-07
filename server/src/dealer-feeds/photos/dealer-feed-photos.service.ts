import { Injectable, Logger } from '@nestjs/common'

import { FileService } from '@/file/file.service'

import {
  DEALER_FEED_ALLOWED_IMAGE_CONTENT_TYPES,
  DEALER_FEED_IMAGE_FETCH_TIMEOUT_MS,
  DEALER_FEED_MAX_IMAGE_SIZE_BYTES
} from '../constants/dealer-feeds.constants'

export interface DealerFeedImageSyncResult {
  // Итоговые ссылки (уже НАШИ, в S3) в том же порядке, что и переданные
  // ссылки дилера — то, что в итоге пишется в Ad.images.
  images: string[]
  // Карта "ссылка дилера -> наша ссылка" — сохраняется в
  // Ad.feedSourceImages для следующей синхронизации (см. там).
  sourceMap: Record<string, string>
  // Ссылки дилера, которые не удалось скачать/перезалить в этот раз —
  // не блокируют создание объявления целиком (см. DealerFeedSyncService),
  // но стоит показать в логе синхронизации.
  failedUrls: string[]
}

// Скачивает фото дилера по прямой ссылке и перезаливает в собственный S3
// (см. обсуждение с владельцем: не отдаём хотлинк на чужой сервер —
// ненадёжно и может быть заблокировано хотлинк-защитой). Переиспользует
// FileService.uploadFile — тот же код, что грузит фото обычных
// объявлений, значит совершенно та же обработка ошибок S3 и тот же
// формат итоговой ссылки.
@Injectable()
export class DealerFeedPhotosService {
  private readonly logger = new Logger(DealerFeedPhotosService.name)

  constructor(private readonly fileService: FileService) {}

  // previousSourceMap — то, что было сохранено при прошлой синхронизации
  // ЭТОЙ ЖЕ позиции (Ad.feedSourceImages) — если ссылка дилера на фото не
  // изменилась с прошлого раза, просто переиспользуем уже загруженную к
  // нам копию вместо повторного скачивания (см. комментарий у
  // Ad.feedSourceImages в schema.prisma). Ссылки, которые пропали из
  // нового списка (дилер убрал фото), просто не попадают в новый
  // sourceMap — сам файл в S3 удаляет уже вызывающий код
  // (DealerFeedSyncService), у него есть полная картина "было/стало".
  async syncImages(
    pictureUrls: string[],
    previousSourceMap: Record<string, string> | null
  ): Promise<DealerFeedImageSyncResult> {
    const images: string[] = []
    const sourceMap: Record<string, string> = {}
    const failedUrls: string[] = []

    for (const sourceUrl of pictureUrls) {
      const cached = previousSourceMap?.[sourceUrl]

      if (cached) {
        images.push(cached)
        sourceMap[sourceUrl] = cached
        continue
      }

      const uploadedUrl = await this.downloadAndUpload(sourceUrl)

      if (uploadedUrl) {
        images.push(uploadedUrl)
        sourceMap[sourceUrl] = uploadedUrl
      } else {
        failedUrls.push(sourceUrl)
      }
    }

    return { images, sourceMap, failedUrls }
  }

  // Ссылки, которые были в предыдущей версии позиции, но не встретились в
  // новом sourceMap этой синхронизации — их файлы в S3 больше ничем не
  // используются, можно удалить, чтобы не копить мусор в бакете.
  async deleteOrphaned(previousSourceMap: Record<string, string> | null, newSourceMap: Record<string, string>) {
    if (!previousSourceMap) return

    const stillUsed = new Set(Object.values(newSourceMap))

    for (const uploadedUrl of Object.values(previousSourceMap)) {
      if (!stillUsed.has(uploadedUrl)) {
        await this.fileService.deleteFileByUrl(uploadedUrl).catch(error => {
          this.logger.warn(`Не удалось удалить неиспользуемое фото фида ${uploadedUrl}: ${(error as Error).message}`)
        })
      }
    }
  }

  private async downloadAndUpload(sourceUrl: string): Promise<string | null> {
    let parsedUrl: URL

    try {
      parsedUrl = new URL(sourceUrl)
    } catch {
      return null
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return null
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEALER_FEED_IMAGE_FETCH_TIMEOUT_MS)

    let response: Response

    try {
      response = await fetch(parsedUrl, { signal: controller.signal })
    } catch (error) {
      this.logger.warn(`Не удалось скачать фото ${sourceUrl}: ${(error as Error).message}`)
      return null
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      this.logger.warn(`Сервер дилера вернул ${response.status} при скачивании фото ${sourceUrl}`)
      return null
    }

    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim()

    if (!contentType || !DEALER_FEED_ALLOWED_IMAGE_CONTENT_TYPES.includes(contentType)) {
      this.logger.warn(`Фото ${sourceUrl} имеет неподдерживаемый content-type: ${contentType ?? 'отсутствует'}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()

    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > DEALER_FEED_MAX_IMAGE_SIZE_BYTES) {
      this.logger.warn(`Фото ${sourceUrl} превышает допустимый размер или пустое (${arrayBuffer.byteLength} байт)`)
      return null
    }

    const extension = contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1]

    const fakeFile = {
      buffer: Buffer.from(arrayBuffer),
      mimetype: contentType,
      originalname: `feed-photo.${extension}`,
      size: arrayBuffer.byteLength
    } as Express.Multer.File

    try {
      const uploaded = await this.fileService.uploadFile(fakeFile, 'ads')
      return uploaded.url
    } catch (error) {
      this.logger.warn(`Не удалось перезалить фото ${sourceUrl} в S3: ${(error as Error).message}`)
      return null
    }
  }
}
