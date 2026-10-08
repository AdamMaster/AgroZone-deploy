import { RateLimitService } from './rate-limit.service'

describe('RateLimitService', () => {
  let client: { incr: jest.Mock; expire: jest.Mock; ttl: jest.Mock }
  let service: RateLimitService

  beforeEach(() => {
    client = { incr: jest.fn(), expire: jest.fn().mockResolvedValue(1), ttl: jest.fn().mockResolvedValue(100) }
    service = new RateLimitService({ getClient: () => client } as any)
  })

  it('первое попадание ставит TTL и разрешает', async () => {
    client.incr.mockResolvedValue(1)

    await expect(service.hit('k', 3, 60)).resolves.toEqual({ allowed: true, count: 1 })
    expect(client.expire).toHaveBeenCalledWith('rl:k', 60)
  })

  it('разрешает до лимита включительно и запрещает после', async () => {
    client.incr.mockResolvedValueOnce(3).mockResolvedValueOnce(4)

    expect((await service.hit('k', 3, 60)).allowed).toBe(true)
    expect((await service.hit('k', 3, 60)).allowed).toBe(false)
    expect(client.expire).not.toHaveBeenCalled()
  })

  it('чинит ключ без TTL при превышении лимита', async () => {
    client.incr.mockResolvedValue(5)
    client.ttl.mockResolvedValue(-1)

    await service.hit('k', 3, 60)
    expect(client.expire).toHaveBeenCalledWith('rl:k', 60)
  })

  it('fail-open при недоступном Redis', async () => {
    client.incr.mockRejectedValue(new Error('down'))

    await expect(service.hit('k', 3, 60)).resolves.toEqual({ allowed: true, count: 0 })
  })
})
