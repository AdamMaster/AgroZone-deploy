import { BadRequestException } from '@nestjs/common'
import sharp from 'sharp'
import { processImage } from './image-processing.util'

const options = { maxDimension: 2000, quality: 82 }

const solidImage = (width: number, height: number, channels: 3 | 4 = 3) =>
  sharp({ create: { width, height, channels, background: { r: 30, g: 140, b: 60, alpha: channels === 4 ? 0.5 : 1 } } })

describe('processImage', () => {
  it.each([
    ['jpeg', () => solidImage(300, 200).jpeg().toBuffer()],
    ['png', () => solidImage(300, 200).png().toBuffer()],
    ['webp', () => solidImage(300, 200).webp().toBuffer()],
    ['gif', () => solidImage(300, 200).gif().toBuffer()]
  ])('принимает настоящий %s и отдаёт JPEG', async (_name, make) => {
    const result = await processImage(await make(), options)
    const metadata = await sharp(result.buffer).metadata()

    expect(result.mimetype).toBe('image/jpeg')
    expect(result.extension).toBe('jpg')
    expect(metadata.format).toBe('jpeg')
    expect(metadata.width).toBe(300)
    expect(metadata.height).toBe(200)
  })

  it('уменьшает большую картинку до maxDimension по большей стороне', async () => {
    const result = await processImage(await solidImage(4000, 3000).jpeg().toBuffer(), options)
    const metadata = await sharp(result.buffer).metadata()

    expect(metadata.width).toBe(2000)
    expect(metadata.height).toBe(1500)
  })

  it('не растягивает маленькую картинку', async () => {
    const result = await processImage(await solidImage(100, 80).png().toBuffer(), options)
    const metadata = await sharp(result.buffer).metadata()

    expect(metadata.width).toBe(100)
    expect(metadata.height).toBe(80)
  })

  it('применяет EXIF-ориентацию и убирает метаданные, включая GPS', async () => {
    const withExif = await solidImage(300, 200)
      .jpeg()
      .withExif({ IFD0: { Copyright: 'secret' }, IFD3: { GPSLatitudeRef: 'N' } })
      .withMetadata({ orientation: 6 })
      .toBuffer()

    const before = await sharp(withExif).metadata()

    expect(before.exif).toBeDefined()
    expect(before.orientation).toBe(6)

    const result = await processImage(withExif, options)
    const after = await sharp(result.buffer).metadata()

    // ориентация 6 — «лежачее» фото: после поворота стороны меняются местами
    expect(after.width).toBe(200)
    expect(after.height).toBe(300)
    expect(after.exif).toBeUndefined()
    expect(after.orientation).toBeUndefined()
    expect(result.buffer.includes(Buffer.from('secret'))).toBe(false)
  })

  it('заливает прозрачность белым, а не чёрным', async () => {
    const transparent = await sharp({
      create: { width: 10, height: 10, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .png()
      .toBuffer()

    const result = await processImage(transparent, options)
    const { data } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true })

    expect(data[0]).toBeGreaterThan(240)
    expect(data[1]).toBeGreaterThan(240)
    expect(data[2]).toBeGreaterThan(240)
  })

  it.each([
    ['HTML под видом картинки', Buffer.from('<html><script>alert(1)</script></html>')],
    ['SVG со скриптом', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ['произвольный текст', Buffer.from('просто текст')],
    ['пустой файл', Buffer.alloc(0)],
    ['обрезанный JPEG', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])],
    ['ZIP-архив', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00])]
  ])('отклоняет: %s', async (_name, buffer) => {
    await expect(processImage(buffer, { ...options, fileName: 'photo.jpg' })).rejects.toThrow(BadRequestException)
  })

  it('называет файл в тексте ошибки', async () => {
    await expect(processImage(Buffer.from('x'), { ...options, fileName: 'evil.jpg' })).rejects.toThrow('«evil.jpg»')
  })

  it('отклоняет картинку с чрезмерным разрешением (защита от бомб декомпрессии)', async () => {
    const huge = await solidImage(9000, 9000).png({ compressionLevel: 9 }).toBuffer()

    await expect(processImage(huge, options)).rejects.toThrow(BadRequestException)
  }, 30_000)
})
