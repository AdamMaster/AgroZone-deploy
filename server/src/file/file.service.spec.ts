import { BadRequestException } from '@nestjs/common'
import sharp from 'sharp'
import { FileService } from './file.service'

const mockSend = jest.fn()

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation(input => ({ type: 'put', input })),
  DeleteObjectCommand: jest.fn().mockImplementation(input => ({ type: 'delete', input })),
  DeleteObjectsCommand: jest.fn().mockImplementation(input => ({ type: 'delete-many', input })),
  HeadObjectCommand: jest.fn().mockImplementation(input => ({ type: 'head', input }))
}))

const config: Record<string, string> = {
  S3_ENDPOINT: 'https://s3.example.com',
  S3_ACCESS_KEY: 'key',
  S3_SECRET_KEY: 'secret',
  S3_BUCKET_NAME: 'bucket',
  S3_PUBLIC_URL: 'https://cdn.example.com'
}

const multerFile = (buffer: Buffer, originalname: string, mimetype: string) =>
  ({ buffer, originalname, mimetype, size: buffer.length }) as Express.Multer.File

describe('FileService', () => {
  let service: FileService

  beforeEach(() => {
    mockSend.mockReset()
    mockSend.mockResolvedValue({})

    service = new FileService({
      get: (key: string) => config[key],
      getOrThrow: (key: string) => config[key]
    } as any)
  })

  const sentCommand = () => mockSend.mock.calls[0][0].input

  describe('uploadImage', () => {
    it('кладёт в бакет перекодированный JPEG, а не присланные байты', async () => {
      const png = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#2a8a3c' } })
        .png()
        .toBuffer()

      const result = await service.uploadImage(multerFile(png, 'photo.PNG', 'image/png'), 'ads')
      const command = sentCommand()

      expect(command.ContentType).toBe('image/jpeg')
      expect(command.Key).toMatch(/^ads\/\d+-\d+\.jpg$/)
      expect((await sharp(command.Body).metadata()).format).toBe('jpeg')
      expect(result.url).toBe(`https://cdn.example.com/${command.Key}`)
      expect(result.fileId).toBe(command.Key)
    })

    it('не доверяет расширению и mimetype от клиента: HTML под видом jpg отклоняется и не уходит в S3', async () => {
      const html = Buffer.from('<html><script>alert(1)</script></html>')

      await expect(service.uploadImage(multerFile(html, 'photo.jpg', 'image/jpeg'), 'ads')).rejects.toThrow(
        BadRequestException
      )
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('аватар уменьшается до 1024 px', async () => {
      const big = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#2a8a3c' } })
        .jpeg()
        .toBuffer()

      await service.uploadAvatar(multerFile(big, 'me.jpg', 'image/jpeg'))
      const command = sentCommand()

      expect(command.Key).toMatch(/^avatars\//)
      expect((await sharp(command.Body).metadata()).width).toBe(1024)
    })
  })

  describe('uploadFile (документы)', () => {
    it('сохраняет файл как есть, расширение берёт безопасное', async () => {
      const buffer = Buffer.from('%PDF-1.4')

      await service.uploadFile(multerFile(buffer, 'price.pdf', 'application/pdf'), 'presentations')
      const command = sentCommand()

      expect(command.Key).toMatch(/^presentations\/\d+-\d+\.pdf$/)
      expect(command.ContentType).toBe('application/pdf')
      expect(command.Body).toBe(buffer)
    })

    it('подозрительное расширение из имени файла заменяется на bin', async () => {
      await service.uploadFile(multerFile(Buffer.from('x'), 'a.b/../c', 'application/pdf'), 'presentations')

      expect(sentCommand().Key).toMatch(/^presentations\/\d+-\d+\.bin$/)
    })
  })

  describe('фото объявлений с уменьшенными копиями', () => {
    const photo = () =>
      sharp({ create: { width: 2400, height: 1800, channels: 3, background: '#2a8a3c' } })
        .jpeg()
        .toBuffer()

    const commands = (type: string) =>
      mockSend.mock.calls.map(([command]) => command).filter(command => command.type === type)

    it('uploadAdPhoto кладёт оригинал JPEG и WebP-копии рядом с ним', async () => {
      const result = await service.uploadAdPhoto(multerFile(await photo(), 'field.jpg', 'image/jpeg'))
      const puts = commands('put').map(command => command.input)
      const original = puts.find(input => input.Key === result.fileId)!

      expect(result.fileId).toMatch(/^ads\/\d+-\d+\.jpg$/)
      expect(original.ContentType).toBe('image/jpeg')
      expect((await sharp(original.Body).metadata()).width).toBe(2000)

      const base = result.fileId.replace(/\.jpg$/, '')
      const variants = puts.filter(input => input !== original)

      expect(variants.map(input => input.Key).sort()).toEqual(
        [`${base}_1280.webp`, `${base}_400.webp`, `${base}_800.webp`].sort()
      )
      for (const input of variants) {
        expect(input.ContentType).toBe('image/webp')
        expect((await sharp(input.Body).metadata()).format).toBe('webp')
      }
    })

    it('если одна из загрузок упала — уже загруженное удаляется, ошибка уходит наверх', async () => {
      mockSend.mockImplementation(command =>
        command.type === 'put' && command.input.Key.endsWith('_800.webp')
          ? Promise.reject(new Error('S3 down'))
          : Promise.resolve({})
      )

      await expect(service.uploadAdPhoto(multerFile(await photo(), 'field.jpg', 'image/jpeg'))).rejects.toThrow()

      const [cleanup] = commands('delete-many')
      expect(cleanup.input.Delete.Objects).toHaveLength(4)
    })

    it('удаление фото объявления убирает и копии', async () => {
      await service.deleteFileByUrl('https://cdn.example.com/ads/1712345678901-1.jpg')

      const [command] = commands('delete-many')
      expect(command.input.Delete.Objects.map((item: { Key: string }) => item.Key)).toEqual([
        'ads/1712345678901-1.jpg',
        'ads/1712345678901-1_400.webp',
        'ads/1712345678901-1_800.webp',
        'ads/1712345678901-1_1280.webp'
      ])
    })

    it('удаление аватара — как раньше, одним объектом', async () => {
      await service.deleteFileByUrl('https://cdn.example.com/avatars/1712345678901-1.jpg')

      expect(commands('delete')).toHaveLength(1)
      expect(commands('delete-many')).toHaveLength(0)
    })

    describe('ensurePhotoVariants', () => {
      const url = 'https://cdn.example.com/ads/1712345678901-1.jpg'

      it('копии уже есть — ничего не скачивает', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch')

        await expect(service.ensurePhotoVariants(url)).resolves.toBe('exists')
        expect(fetchSpy).not.toHaveBeenCalled()
        fetchSpy.mockRestore()
      })

      it('копий нет — делает их из оригинала, самую большую последней', async () => {
        const original = await photo()
        const fetchSpy = jest
          .spyOn(global, 'fetch')
          .mockResolvedValue(new Response(new Uint8Array(original), { status: 200 }))
        mockSend.mockImplementation(command =>
          command.type === 'head'
            ? Promise.reject(Object.assign(new Error('nf'), { name: 'NotFound' }))
            : Promise.resolve({})
        )

        await expect(service.ensurePhotoVariants(url)).resolves.toBe('created')
        // Оригинал — по публичной ссылке, а не через S3 API.
        expect(fetchSpy).toHaveBeenCalledWith(url, expect.anything())
        fetchSpy.mockRestore()

        expect(commands('put').map(command => command.input.Key)).toEqual([
          'ads/1712345678901-1_400.webp',
          'ads/1712345678901-1_800.webp',
          'ads/1712345678901-1_1280.webp'
        ])
      })

      it('оригинал не скачался — ошибка, копии не пишутся', async () => {
        const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 404 }))
        mockSend.mockImplementation(command =>
          command.type === 'head'
            ? Promise.reject(Object.assign(new Error('nf'), { name: 'NotFound' }))
            : Promise.resolve({})
        )

        await expect(service.ensurePhotoVariants(url)).rejects.toThrow('404')
        expect(commands('put')).toHaveLength(0)
        fetchSpy.mockRestore()
      })

      it('не фото объявления — пропускает', async () => {
        await expect(service.ensurePhotoVariants('https://cdn.example.com/avatars/1-2.jpg')).resolves.toBe(
          'not-applicable'
        )
        expect(mockSend).not.toHaveBeenCalled()
      })
    })
  })
})
