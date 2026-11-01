import { CategoriesService } from './categories.service'

describe('CategoriesService.findAll (дерево категорий)', () => {
  const category = (id: string, parentId: string | null) => ({
    id,
    name: id,
    slug: id,
    code: id,
    iconId: null,
    parentId,
    level: parentId ? 1 : 0,
    sortOrder: 0,
    path: id,
    fullPath: id,
    priceUnits: []
  })

  let prisma: { category: { findMany: jest.Mock } }
  let service: CategoriesService

  beforeEach(() => {
    prisma = { category: { findMany: jest.fn() } }
    service = new CategoriesService(prisma as never, {} as never, { get: () => undefined } as never)
  })

  it('строит дерево и не ходит в базу повторно, пока кэш свежий', async () => {
    prisma.category.findMany.mockResolvedValue([category('tech', null), category('tractors', 'tech')])

    const first = await service.findAll()
    const second = await service.findAll()

    expect(first).toEqual([
      expect.objectContaining({ id: 'tech', children: [expect.objectContaining({ id: 'tractors' })] })
    ])
    expect(second).toBe(first)
    expect(prisma.category.findMany).toHaveBeenCalledTimes(1)
  })

  it('пустое дерево (база пересоздаётся) не кэшируется', async () => {
    prisma.category.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([category('tech', null)])

    await expect(service.findAll()).resolves.toEqual([])
    await expect(service.findAll()).resolves.toHaveLength(1)
  })
})
