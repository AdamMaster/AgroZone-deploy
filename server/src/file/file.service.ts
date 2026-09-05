import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import 'multer'

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

  async uploadFile(file: Express.Multer.File, folder: string = 'ads') {
    const fileExtension = file.originalname.split('.').pop()
    // Сохраняем структуру папок внутри бакета с помощью косой черты
    const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExtension}`
    const bucketName = this.configService.getOrThrow<string>('S3_BUCKET_NAME')

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype
        })
      )
    } catch (error) {
      // Сюда попадают, в частности, ошибки доступа к S3 (неверные/просроченные
      // ключи, не настроенная bucket policy на стороне провайдера — см.
      // обсуждение миграции на Selectel) — раньше такая ошибка вылетала из
      // AWS SDK необработанной и долетала до клиента голым "Internal server
      // error" без единой зацепки, что вообще пошло не так.
      this.logger.error(`Не удалось загрузить файл в S3 (${fileName})`, error as Error)

      throw new InternalServerErrorException('Не удалось загрузить файл. Попробуйте чуть позже.')
    }

    // ВАЖНО: ссылка строится через S3_PUBLIC_URL (публичный домен бакета,
    // «Домены» → «Основной домен» в панели Selectel), а НЕ через
    // S3_ENDPOINT + bucketName. У Selectel сам S3 API endpoint не отдаёт
    // объекты анонимным запросам вообще — только подписанные (см.
    // обсуждение с пользователем при миграции с Timeweb): сколько ни
    // настраивай bucket policy, ссылка на API-эндпоинт всегда будет 403
    // для обычного посетителя сайта. Публичный домен бакета не требует
    // имени бакета в пути — оно уже "зашито" в поддомен.
    const publicUrl = this.configService.getOrThrow<string>('S3_PUBLIC_URL')

    return {
      url: `${publicUrl}/${fileName}`,
      fileId: fileName
    }
  }

  async deleteFile(fileId: string) {
    const bucketName = this.configService.getOrThrow<string>('S3_BUCKET_NAME')

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: fileId
        })
      )
    } catch (error) {
      this.logger.error(`Не удалось удалить файл из S3 (${fileId})`, error as Error)

      throw new InternalServerErrorException('Не удалось удалить файл. Попробуйте чуть позже.')
    }

    return { success: true }
  }

  // Удобный шорткат поверх deleteFile — принимает не fileId (ключ в бакете),
  // а полный URL, который и хранится в БД (User.picture, Ad.images).
  // Раньше извлечение fileId из URL (url.split(bucketName/)[1]) было
  // продублировано в UserService/AdsService — здесь центральное место для
  // новых мест использования (см. UserService.deleteAccount,
  // AdsArchivePurgeWorker), чтобы не плодить третью копию.
  async deleteFileByUrl(url: string) {
    const publicUrl = this.configService.getOrThrow<string>('S3_PUBLIC_URL')
    const bucketName = this.configService.getOrThrow<string>('S3_BUCKET_NAME')

    // Текущий формат (см. uploadFile) — ссылка на публичный домен бакета,
    // имени бакета в пути нет. Старый формат (Timeweb, и первые тестовые
    // загрузки на Selectel до того, как выяснилось, что его S3 API не
    // отдаёт объекты анонимно) — путь вида endpoint/bucketName/fileId.
    // Пробуем оба варианта, чтобы очистка старых файлов не тихо
    // проглатывалась только из-за смены формата ссылок.
    const fileId = url.startsWith(`${publicUrl}/`) ? url.slice(publicUrl.length + 1) : url.split(`${bucketName}/`)[1]

    if (fileId) {
      await this.deleteFile(fileId)
    }
  }
}
