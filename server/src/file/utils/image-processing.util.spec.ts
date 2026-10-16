import { BadRequestException } from '@nestjs/common'
import sharp from 'sharp'
import { createPhotoCard, createPhotoVariants, processImage } from './image-processing.util'

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

describe('createPhotoVariants', () => {
  it('делает WebP-копии нужных размеров по большей стороне', async () => {
    const original = await solidImage(2000, 1500).jpeg().toBuffer()

    const variants = await createPhotoVariants(original, [400, 800])

    const small = await sharp(variants.get(400)).metadata()
    const medium = await sharp(variants.get(800)).metadata()

    expect(small).toMatchObject({ format: 'webp', width: 400, height: 300 })
    expect(medium).toMatchObject({ format: 'webp', width: 800, height: 600 })
  })

  it('поворачивает по EXIF старое фото, загруженное до перекодирования', async () => {
    // Ориентация 6 — «повернуть на 90° по часовой»: 400×200 на экране — 200×400.
    const original = await solidImage(400, 200).jpeg().withMetadata({ orientation: 6 }).toBuffer()

    const variants = await createPhotoVariants(original, [400])

    expect(await sharp(variants.get(400)).metadata()).toMatchObject({ width: 200, height: 400 })
  })

  it('не растягивает фото меньше размера копии', async () => {
    const original = await solidImage(600, 300).jpeg().toBuffer()

    const variants = await createPhotoVariants(original, [800])

    expect(await sharp(variants.get(800)).metadata()).toMatchObject({ width: 600, height: 300 })
  })
})

describe('createPhotoCard', () => {
  it('делает квадратную WebP-копию 520 px', async () => {
    const original = await solidImage(2000, 1500).jpeg().toBuffer()

    expect(await sharp(await createPhotoCard(original)).metadata()).toMatchObject({
      format: 'webp',
      width: 520,
      height: 520
    })
  })

  it('обрезает по центру, как object-cover у карточки', async () => {
    // 1200×600: слева и справа красные края, посередине зелёная полоса. Квадрат 600×600
    // по центру захватывает полосу и по 100 px красного с каждой стороны; в
    // копии он сжат до 520×520: полоса там — примерно от 87 до 433 px.
    const stripe = (color: { r: number; g: number; b: number }, width: number) =>
      sharp({ create: { width, height: 600, channels: 3, background: color } })
        .png()
        .toBuffer()
    const original = await sharp({
      create: { width: 1200, height: 600, channels: 3, background: { r: 255, g: 0, b: 0 } }
    })
      .composite([{ input: await stripe({ r: 0, g: 255, b: 0 }, 400), left: 400, top: 0 }])
      .jpeg({ quality: 100 })
      .toBuffer()

    const { data, info } = await sharp(await createPhotoCard(original))
      .raw()
      .toBuffer({ resolveWithObject: true })
    const pixel = (x: number, y: number) => [...data.subarray((y * info.width + x) * info.channels).subarray(0, 3)]

    expect(info).toMatchObject({ width: 520, height: 520 })
    expect(pixel(260, 260)[1]).toBeGreaterThan(200) // центр — зелёная полоса
    expect(pixel(20, 260)[0]).toBeGreaterThan(200) // край — красный
    expect(pixel(500, 260)[0]).toBeGreaterThan(200)
  })

  it('не растягивает фото меньше 520 px: сторона квадрата — короткая сторона фото', async () => {
    const original = await solidImage(500, 300).jpeg().toBuffer()

    expect(await sharp(await createPhotoCard(original)).metadata()).toMatchObject({ width: 300, height: 300 })
  })

  it('учитывает EXIF-ориентацию старого фото', async () => {
    // Ориентация 6: 400×200 в файле — 200×400 на экране, квадрат 200×200.
    const original = await solidImage(400, 200).jpeg().withMetadata({ orientation: 6 }).toBuffer()

    expect(await sharp(await createPhotoCard(original)).metadata()).toMatchObject({ width: 200, height: 200 })
  })
})
