import { BadRequestException } from '@nestjs/common'
import sharp from 'sharp'
import { FileService } from './file.service'

const mockSend = jest.fn()

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation(input => ({ input })),
  DeleteObjectCommand: jest.fn().mockImplementation(input => ({ input }))
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
})
