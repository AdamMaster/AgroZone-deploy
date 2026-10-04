import {
  collectReferencedKeys,
  extractS3Key,
  findMissingKeys,
  findOrphanedObjects,
  S3ObjectInfo,
  S3UrlContext
} from './s3-keys.util'

const context: S3UrlContext = { publicUrl: 'https://cdn.example.ru', bucketName: 'agro-bucket' }

const object = (key: string, lastModified = '2026-01-01T00:00:00Z'): S3ObjectInfo => ({
  key,
  size: 100,
  lastModified: new Date(lastModified)
})

describe('s3-keys.util', () => {
  describe('extractS3Key', () => {
    it('понимает текущий формат — ссылка на публичный домен бакета', () => {
      expect(extractS3Key('https://cdn.example.ru/ads/1-2.jpg', context)).toBe('ads/1-2.jpg')
    })

    it('понимает старый формат — endpoint/bucket/key', () => {
      expect(extractS3Key('https://s3.timeweb.cloud/agro-bucket/ads/1-2.jpg', context)).toBe('ads/1-2.jpg')
    })

    it('возвращает null для чужой ссылки', () => {
      expect(extractS3Key('https://avatars.yandex.net/get-yapic/123/islands-200', context)).toBeNull()
    })

    it('возвращает null, если после префикса ничего нет', () => {
      expect(extractS3Key('https://cdn.example.ru/', context)).toBeNull()
    })
  })

  describe('collectReferencedKeys', () => {
    it('собирает ключи, пропуская пустые значения и чужие ссылки', () => {
      const keys = collectReferencedKeys(
        [
          'https://cdn.example.ru/ads/a.jpg',
          null,
          undefined,
          '',
          'https://other.site/x.jpg',
          'https://cdn.example.ru/ads/a.jpg'
        ],
        context
      )

      expect([...keys]).toEqual(['ads/a.jpg'])
    })
  })

  describe('findOrphanedObjects', () => {
    const olderThan = new Date('2026-06-01T00:00:00Z')

    it('находит объекты без ссылок из БД', () => {
      const orphans = findOrphanedObjects(
        [object('ads/used.jpg'), object('ads/lost.jpg'), object('avatars/lost.png')],
        new Set(['ads/used.jpg']),
        olderThan
      )

      expect(orphans.map(o => o.key)).toEqual(['ads/lost.jpg', 'avatars/lost.png'])
    })

    it('не считает осиротевшими свежие объекты (возможна гонка с загрузкой)', () => {
      const orphans = findOrphanedObjects([object('ads/fresh.jpg', '2026-06-01T00:00:01Z')], new Set(), olderThan)

      expect(orphans).toEqual([])
    })

    it('не трогает объекты вне папок приложения', () => {
      const orphans = findOrphanedObjects([object('backups/db.sql'), object('logo.png')], new Set(), olderThan)

      expect(orphans).toEqual([])
    })
  })

  describe('findMissingKeys', () => {
    it('находит ссылки на объекты, которых нет в бакете', () => {
      const missing = findMissingKeys(new Set(['ads/exists.jpg', 'ads/gone.jpg', 'other/x.jpg']), [
        object('ads/exists.jpg')
      ])

      expect(missing).toEqual(['ads/gone.jpg'])
    })
  })
})
