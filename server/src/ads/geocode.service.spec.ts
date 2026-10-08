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
})
