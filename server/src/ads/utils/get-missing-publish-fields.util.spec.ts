import { getMissingPublishFields } from './get-missing-publish-fields.util'

const complete = {
  title: 'Морковь',
  description: 'Морковь урожай 2026 года',
  address: 'г Ставрополь, ул Ленина, 1',
  phone: '79991234567'
}

describe('getMissingPublishFields', () => {
  it('у заполненного объявления недостающего нет', () => {
    expect(getMissingPublishFields(complete)).toEqual([])
  })

  it('пустой черновик — все поля, в порядке формы', () => {
    expect(getMissingPublishFields({ title: '', description: '', address: '', phone: '' })).toEqual([
      'название',
      'описание',
      'адрес',
      'номер телефона'
    ])
  })

  it.each([
    ['название', { title: 'Мо' }],
    ['описание', { description: 'Короткое' }],
    ['адрес', { address: 'г С' }]
  ])('%s короче минимума — недостающее', (label, patch) => {
    expect(getMissingPublishFields({ ...complete, ...patch })).toEqual([label])
  })

  it('пробелы не считаются символами', () => {
    expect(getMissingPublishFields({ ...complete, description: '          ' })).toEqual(['описание'])
  })

  it('граница: ровно минимальная длина проходит', () => {
    expect(getMissingPublishFields({ ...complete, title: 'Мор', description: '1234567890', address: '12345' })).toEqual(
      []
    )
  })
})
