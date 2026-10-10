import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3'
import 'multer'
import { extractS3Key } from './utils/s3-keys.util'
import {
  AVATAR_IMAGE_OPTIONS,
  PHOTO_IMAGE_OPTIONS,
  ProcessImageOptions,
  createPhotoVariants,
  processImage
} from './utils/image-processing.util'
import {
  PHOTO_VARIANT_CONTENT_TYPE,
  PHOTO_VARIANT_SIZES,
  hasPhotoVariants,
  photoVariantKey,
  photoVariantKeys
} from './utils/photo-variants.util'

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'

// Итог ensurePhotoVariants: копии уже были, сделаны сейчас или у объекта
// их не бывает (не фото объявления).
export type EnsurePhotoVariantsResult = 'exists' | 'created' | 'not-applicable'

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name)
  private s3Client: S3Client

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      endpoint: this.configService.getOrThrow<string>('S3_ENDPOINT'),
      region: this.configService.get<string>('S3_REGION') || 'ru-1',
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.configService.getOrThrow<string>('S3_SECRET_KEY')
      },
      // forcePathStyle: без него SDK по умолчанию обращается к бакету
      // через виртуальный хост (bucket.endpoint), а не endpoint/bucket —
      // так исторически было нужно для Timeweb. Это только про адресацию
      // самих API-запросов (PutObject/DeleteObject) к S3_ENDPOINT — на
      // публичную ссылку (S3_PUBLIC_URL, см. uploadFile) не влияет: тот
      // домен отдельный, к нему AWS SDK вообще не обращается.
      forcePathStyle: true
    })
  }

  // Фото (объявления, аватары, фиды дилеров): файл проверяется по содержимому
  // и перекодируется в чистый JPEG — см. processImage. В бакет попадает только
  // результат, а не то, что прислал клиент: расширение и ContentType берутся
  // из него, а не из имени файла и mimetype запроса. Не-картинку отклоняет
  // BadRequestException.
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'ads',
    options: Pick<ProcessImageOptions, 'maxDimension' | 'quality'> = PHOTO_IMAGE_OPTIONS
  ) {
    const processed = await processImage(file.buffer, { ...options, fileName: file.originalname })

    return this.putObject(this.generateKey(folder, processed.extension), processed.buffer, processed.mimetype)
  }

  // Фото объявления: оригинал и его уменьшенные копии (photo-variants.util).
  // Всё или ничего: без копий клиент показал бы вместо фото ошибку
  // загрузки, поэтому при сбое уже загруженное удаляется, а ошибка уходит
  // наверх, как и при сбое самого оригинала.
  async uploadAdPhoto(file: Express.Multer.File) {
    const processed = await processImage(file.buffer, { ...PHOTO_IMAGE_OPTIONS, fileName: file.originalname })
    const key = this.generateKey('ads', processed.extension)
    const variants = await createPhotoVariants(processed.buffer, PHOTO_VARIANT_SIZES)

    const uploads = [
      { key, body: processed.buffer, contentType: processed.mimetype },
      ...[...variants].map(([size, body]) => ({
        key: photoVariantKey(key, size),
        body,
        contentType: PHOTO_VARIANT_CONTENT_TYPE
      }))
    ]

    const results = await Promise.allSettled(
      uploads.map(upload => this.putObject(upload.key, upload.body, upload.contentType))
    )
    const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')

    if (failed) {
      await this.deleteKeysQuietly(uploads.map(upload => upload.key))
      throw failed.reason
    }

    return this.toUploadResult(key)
  }

  // Делает копии фото, загруженного до их появления (scripts/
  // generate-photo-variants.ts). Повторный запуск безопасен: если самая
  // большая копия уже есть, фото пропускается.
  async ensurePhotoVariants(url: string): Promise<EnsurePhotoVariantsResult> {
    const key = this.urlToKey(url)

    if (!key || !hasPhotoVariants(key)) return 'not-applicable'

    const largest = photoVariantKey(key, PHOTO_VARIANT_SIZES[PHOTO_VARIANT_SIZES.length - 1])

    if (await this.objectExists(largest)) return 'exists'

    const original = await this.s3Client.send(new GetObjectCommand({ Bucket: this.bucketName, Key: key }))

    if (!original.Body) throw new Error(`Пустой ответ S3 для ${key}`)

    const variants = await createPhotoVariants(
      Buffer.from(await original.Body.transformToByteArray()),
      PHOTO_VARIANT_SIZES
    )

    // Самая большая — последней: по ней определяется, что копии готовы, и
    // если скрипт прервут посередине, при следующем запуске фото доделается.
    for (const [size, body] of variants) {
      await this.putObject(photoVariantKey(key, size), body, PHOTO_VARIANT_CONTENT_TYPE)
    }

    return 'created'
  }

  uploadAvatar(file: Express.Multer.File) {
    return this.uploadImage(file, 'avatars', AVATAR_IMAGE_OPTIONS)
  }

  // Документы (презентации): тип файла к этому моменту уже проверен
  // контроллером по содержимому (FileTypeValidator). Для картинок используй
  // uploadImage — этот метод хранит файл как есть.
  async uploadFile(file: Express.Multer.File, folder: string = 'ads') {
    // Расширение приходит из имени файла клиента: оставляем только буквы и
    // цифры, чтобы в ключ объекта не попало ничего лишнего (слэши, точки).
    const rawExtension = file.originalname.split('.').pop() ?? ''
    const extension = /^[a-z0-9]{1,8}$/i.test(rawExtension) ? rawExtension.toLowerCase() : 'bin'

    return this.putObject(this.generateKey(folder, extension), file.buffer, file.mimetype)
  }

  private get bucketName() {
    return this.configService.getOrThrow<string>('S3_BUCKET_NAME')
  }

  // Структура папок внутри бакета — через косую черту.
  private generateKey(folder: string, extension: string) {
    return `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`
  }

  // ВАЖНО: ссылка строится через S3_PUBLIC_URL (публичный домен бакета,
  // «Домены» → «Основной домен» в панели Selectel), а НЕ через
  // S3_ENDPOINT + bucketName. У Selectel сам S3 API endpoint не отдаёт
  // объекты анонимным запросам вообще — только подписанные: ссылка на
  // API-эндпоинт всегда будет 403 для обычного посетителя сайта. Публичный
  // домен бакета не требует имени бакета в пути — оно уже в поддомене.
  private toUploadResult(key: string) {
    const publicUrl = this.configService.getOrThrow<string>('S3_PUBLIC_URL')

    return { url: `${publicUrl}/${key}`, fileId: key }
  }

  private urlToKey(url: string) {
    return extractS3Key(url, {
      publicUrl: this.configService.getOrThrow<string>('S3_PUBLIC_URL'),
      bucketName: this.bucketName
    })
  }

  private async putObject(key: string, body: Buffer, contentType: string) {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Ключ каждого файла уникален и не перезаписывается — браузер,
          // приложение и CDN могут хранить его сколько угодно.
          CacheControl: IMMUTABLE_CACHE_CONTROL
        })
      )
    } catch (error) {
      // Сюда попадают, в частности, ошибки доступа к S3 (неверные или
      // просроченные ключи, не настроенная bucket policy у провайдера) — без
      // лога такая ошибка доходила бы до клиента голым "Internal server
      // error" без единой зацепки.
      this.logger.error(`Не удалось загрузить файл в S3 (${key})`, error as Error)

      throw new InternalServerErrorException('Не удалось загрузить файл. Попробуйте чуть позже.')
    }

    return this.toUploadResult(key)
  }

  private async objectExists(key: string) {
    try {
      await this.s3Client.send(new HeadObjectCommand({ Bucket: this.bucketName, Key: key }))
      return true
    } catch (error) {
      if ((error as { name?: string }).name === 'NotFound') return false
      throw error
    }
  }

  // Откат неудачной загрузки: сбой при уборке только пишем в лог — исходная
  // ошибка загрузки важнее.
  private async deleteKeysQuietly(keys: string[]) {
    try {
      await this.deleteKeys(keys)
    } catch (error) {
      this.logger.warn(`Не удалось убрать файлы после сбоя загрузки: ${(error as Error).message}`)
    }
  }

  private async deleteKeys(keys: string[]) {
    const result = await this.s3Client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: { Objects: keys.map(Key => ({ Key })), Quiet: true }
      })
    )

    if (result.Errors?.length) {
      throw new Error(result.Errors.map(item => `${item.Key}: ${item.Message}`).join('; '))
    }
  }

  // Удаляет объект, а у фото объявления — и его уменьшенные копии.
  async deleteFile(fileId: string) {
    const variantKeys = photoVariantKeys(fileId)

    try {
      if (variantKeys.length) {
        await this.deleteKeys([fileId, ...variantKeys])
      } else {
        await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: fileId }))
      }
    } catch (error) {
      this.logger.error(`Не удалось удалить файл из S3 (${fileId})`, error as Error)

      throw new InternalServerErrorException('Не удалось удалить файл. Попробуйте чуть позже.')
    }

    return { success: true }
  }

  async deleteFileByUrl(url: string) {
    const fileId = this.urlToKey(url)

    if (fileId) {
      await this.deleteFile(fileId)
    }
  }
}
