import { PHOTO_VARIANT_SIZES, hasPhotoVariants, photoVariantKey, photoVariantKeys } from './photo-variants.util'

describe('photo-variants.util', () => {
  const key = 'ads/1712345678901-123456789.jpg'

  it('копии есть только у фото объявлений', () => {
    expect(hasPhotoVariants(key)).toBe(true)
    expect(hasPhotoVariants('avatars/1712345678901-1.jpg')).toBe(false)
    expect(hasPhotoVariants('presentations/1712345678901-1.pdf')).toBe(false)
    // Сами копии копий не имеют.
    expect(hasPhotoVariants('ads/1712345678901-123456789_800.webp')).toBe(false)
  })

  it('старые фото с исходным расширением тоже получают копии', () => {
    for (const extension of ['png', 'webp', 'jpeg', 'JPG', 'gif']) {
      const oldKey = `ads/1790075973922-951768558.${extension}`

      expect(hasPhotoVariants(oldKey)).toBe(true)
      expect(photoVariantKey(oldKey, 800)).toBe('ads/1790075973922-951768558_800.webp')
    }

    expect(hasPhotoVariants('ads/1790075973922-951768558.pdf')).toBe(false)
  })

  it('ключ копии выводится из ключа оригинала', () => {
    expect(photoVariantKey(key, 800)).toBe('ads/1712345678901-123456789_800.webp')
    expect(photoVariantKeys(key)).toEqual(PHOTO_VARIANT_SIZES.map(size => `ads/1712345678901-123456789_${size}.webp`))
  })

  it('у остальных объектов копий нет', () => {
    expect(photoVariantKeys('avatars/1-2.jpg')).toEqual([])
    expect(() => photoVariantKey('avatars/1-2.jpg', 400)).toThrow()
  })
})
