import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { SaveDraftDto } from './save-draft.dto'

// Те же опции, что у глобального ValidationPipe (main.ts).
const check = async (body: object) => {
  const dto = plainToInstance(SaveDraftDto, body)
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true })

  return { dto, properties: errors.map(error => error.property) }
}

describe('SaveDraftDto', () => {
  it('достаточно названия и категории', async () => {
    const { properties } = await check({ title: 'Морковь', categoryId: 'cat-1' })

    expect(properties).toEqual([])
  })

  it.each([['title'], ['categoryId']])('без поля %s — ошибка', async field => {
    const body: Record<string, string> = { title: 'Морковь', categoryId: 'cat-1' }
    delete body[field]

    expect((await check(body)).properties).toEqual([field])
  })

  it('пустое название — ошибка', async () => {
    expect((await check({ title: '', categoryId: 'cat-1' })).properties).toEqual(['title'])
  })

  it('поля формы разбираются как у обычного объявления: число из строки, одно фото — массивом', async () => {
    const { dto, properties } = await check({
      title: 'Морковь',
      categoryId: 'cat-1',
      price: '20',
      lat: '45.04',
      lng: '41.97',
      unit: 'KG',
      existingImages: 'https://cdn.example/ads/a.jpg',
      features: '{"sort":"A"}'
    })

    expect(properties).toEqual([])
    expect(dto).toMatchObject({
      price: 20,
      lat: 45.04,
      lng: 41.97,
      existingImages: ['https://cdn.example/ads/a.jpg'],
      features: { sort: 'A' }
    })
  })

  it('пустая строка вместо точки — «не указано», а не 0', async () => {
    const { dto, properties } = await check({ title: 'Морковь', categoryId: 'cat-1', lat: '', lng: '' })

    expect(properties).toEqual([])
    expect(dto.lat).toBeUndefined()
    expect(dto.lng).toBeUndefined()
  })

  it('«потерянное» значение точки — ошибка, а не 0', async () => {
    expect((await check({ title: 'Морковь', categoryId: 'cat-1', lat: 'abc' })).properties).toEqual(['lat'])
  })

  it('кривой номер телефона — ошибка, пустой номер не присылается', async () => {
    expect((await check({ title: 'Морковь', categoryId: 'cat-1', phone: '123' })).properties).toEqual(['phone'])
  })

  it('неизвестное поле отклоняется, как у остальных DTO', async () => {
    expect((await check({ title: 'Морковь', categoryId: 'cat-1', status: 'PUBLISHED' })).properties).toEqual(['status'])
  })
})
