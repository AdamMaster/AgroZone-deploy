import { TtlCache } from './ttl-cache.util'

describe('TtlCache', () => {
  let time: number
  const now = () => time

  beforeEach(() => {
    time = 1_000
  })

  it('пока значение свежее, повторно не загружает', async () => {
    const load = jest.fn().mockResolvedValue('v1')
    const cache = new TtlCache({ ttlMs: 100, load, now })

    await expect(cache.get()).resolves.toBe('v1')
    time += 99
    await expect(cache.get()).resolves.toBe('v1')

    expect(load).toHaveBeenCalledTimes(1)
  })

  it('по истечении срока загружает заново', async () => {
    const load = jest.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2')
    const cache = new TtlCache({ ttlMs: 100, load, now })

    await cache.get()
    time += 100

    await expect(cache.get()).resolves.toBe('v2')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('одновременные запросы при пустом кэше ждут одну загрузку', async () => {
    let resolve!: (value: string) => void
    const load = jest.fn(() => new Promise<string>(r => (resolve = r)))
    const cache = new TtlCache({ ttlMs: 100, load, now })

    const results = Promise.all([cache.get(), cache.get(), cache.get()])
    resolve('v1')

    await expect(results).resolves.toEqual(['v1', 'v1', 'v1'])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('если загрузка упала, отдаёт прежнее значение, а следующий запрос пробует снова', async () => {
    const load = jest
      .fn()
      .mockResolvedValueOnce('v1')
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce('v2')
    const cache = new TtlCache({ ttlMs: 100, load, now })

    await cache.get()
    time += 100

    await expect(cache.get()).resolves.toBe('v1')
    await expect(cache.get()).resolves.toBe('v2')
  })

  it('без прежнего значения ошибка загрузки пробрасывается', async () => {
    const cache = new TtlCache({ ttlMs: 100, load: jest.fn().mockRejectedValue(new Error('db down')), now })

    await expect(cache.get()).rejects.toThrow('db down')
  })

  it('значение, которое нельзя кэшировать, отдаётся, но не сохраняется', async () => {
    const load = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(['a'])
    const cache = new TtlCache<string[]>({ ttlMs: 100, load, now, shouldCache: value => value.length > 0 })

    await expect(cache.get()).resolves.toEqual([])
    await expect(cache.get()).resolves.toEqual(['a'])
    await expect(cache.get()).resolves.toEqual(['a'])
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('invalidate сбрасывает значение', async () => {
    const load = jest.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2')
    const cache = new TtlCache({ ttlMs: 100, load, now })

    await cache.get()
    cache.invalidate()

    await expect(cache.get()).resolves.toBe('v2')
  })
})
