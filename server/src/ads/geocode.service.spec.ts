import { ServiceUnavailableException } from '@nestjs/common'
import { GeocodeService } from './geocode.service'

describe('GeocodeService', () => {
  let service: GeocodeService
  let redis: { get: jest.Mock; set: jest.Mock }
  const fetchMock = jest.fn()

  const yandexResponse = (text?: string) => ({
    ok: true,
    status: 200,
    json: async () => ({
      response: {
        GeoObjectCollection: {
          featureMember: text ? [{ GeoObject: { metaDataProperty: { GeocoderMetaData: { text } } } }] : []
        }
      }
    })
  })

  beforeEach(() => {
    redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) }
    service = new GeocodeService({ get: () => 'key' } as any, redis as any)
    fetchMock.mockReset()
    global.fetch = fetchMock as any
  })

  it('возвращает адрес из кэша без запроса в Яндекс', async () => {
    redis.get.mockResolvedValue(JSON.stringify('Москва'))

    await expect(service.getAddressFromCoords(55.75, 37.61)).resolves.toBe('Москва')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ходит в Яндекс при промахе кэша и кэширует адрес по округлённым координатам', async () => {
    fetchMock.mockResolvedValue(yandexResponse('Россия, Москва'))

    await expect(service.getAddressFromCoords(55.751244, 37.618423)).resolves.toBe('Россия, Москва')
    expect(redis.get).toHaveBeenCalledWith('geocode:55.7512,37.6184')
    expect(redis.set).toHaveBeenCalledWith('geocode:55.7512,37.6184', 'Россия, Москва', 7 * 24 * 60 * 60)
  })

  it('«Адрес не найден» не кэшируется', async () => {
    fetchMock.mockResolvedValue(yandexResponse())

    await expect(service.getAddressFromCoords(0, 0)).resolves.toBe('Адрес не найден')
    expect(redis.set).not.toHaveBeenCalled()
  })

  it('503 при ошибке или таймауте Яндекса', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 }).mockRejectedValueOnce(new Error('timeout'))

    await expect(service.getAddressFromCoords(1, 1)).rejects.toBeInstanceOf(ServiceUnavailableException)
    await expect(service.getAddressFromCoords(1, 1)).rejects.toBeInstanceOf(ServiceUnavailableException)
  })

  it('503, а не 500, если ключ геокодера не задан', async () => {
    service = new GeocodeService({ get: () => undefined } as any, redis as any)

    await expect(service.getAddressFromCoords(1, 1)).rejects.toBeInstanceOf(ServiceUnavailableException)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('сбой Redis не ломает ответ', async () => {
    redis.get.mockRejectedValue(new Error('down'))
    redis.set.mockRejectedValue(new Error('down'))
    fetchMock.mockResolvedValue(yandexResponse('Казань'))

    await expect(service.getAddressFromCoords(55.79, 49.12)).resolves.toBe('Казань')
  })

  describe('getCoordsFromAddress', () => {
    const pointResponse = (pos?: string, kind = 'house') => ({
      ok: true,
      status: 200,
      json: async () => ({
        response: {
          GeoObjectCollection: {
            featureMember: pos
              ? [{ GeoObject: { Point: { pos }, metaDataProperty: { GeocoderMetaData: { kind } } } }]
              : []
          }
        }
      })
    })

    it('Яндекс отдаёт «долгота широта» — возвращаем {lat, lng} и кэшируем по адресу', async () => {
      fetchMock.mockResolvedValue(pointResponse('41.97 45.04'))

      await expect(service.getCoordsFromAddress('  г Ставрополь,   ул Ленина  ')).resolves.toEqual({
        lat: 45.04,
        lng: 41.97
      })
      expect(String(fetchMock.mock.calls[0][0])).toContain('geocode=%D0%B3+%D0%A1%D1%82')
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^geocode:address:[0-9a-f]{40}$/),
        { lat: 45.04, lng: 41.97 },
        7 * 24 * 60 * 60
      )
    })

    it('регистр и лишние пробелы не создают отдельных записей кэша', async () => {
      fetchMock.mockResolvedValue(pointResponse('41.97 45.04'))

      await service.getCoordsFromAddress('Г Ставрополь, ул Ленина')
      await service.getCoordsFromAddress('г  ставрополь, ул ленина')

      expect(redis.set.mock.calls[0][0]).toBe(redis.set.mock.calls[1][0])
    })

    it('точка из кэша — без запроса в Яндекс', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ lat: 1, lng: 2 }))

      await expect(service.getCoordsFromAddress('г Ставрополь')).resolves.toEqual({ lat: 1, lng: 2 })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('не нашёл — null, и это не кэшируется', async () => {
      fetchMock.mockResolvedValue(pointResponse())

      await expect(service.getCoordsFromAddress('абвгд')).resolves.toBeNull()
      expect(redis.set).not.toHaveBeenCalled()
    })

    it('страна — слишком грубо, как «не нашёл»', async () => {
      fetchMock.mockResolvedValue(pointResponse('37.6 55.7', 'country'))

      await expect(service.getCoordsFromAddress('Россия')).resolves.toBeNull()
    })

    it('область принимается: продавцы оптовой продукции указывают адрес до области', async () => {
      fetchMock.mockResolvedValue(pointResponse('49.66 58.6', 'province'))

      await expect(service.getCoordsFromAddress('Кировская обл')).resolves.toEqual({ lat: 58.6, lng: 49.66 })
    })

    it('пустой адрес — null без запроса', async () => {
      await expect(service.getCoordsFromAddress('   ')).resolves.toBeNull()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('сбой Яндекса — 503, а не «адрес не найден»', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 })

      await expect(service.getCoordsFromAddress('г Ставрополь')).rejects.toBeInstanceOf(ServiceUnavailableException)
    })
  })
})
