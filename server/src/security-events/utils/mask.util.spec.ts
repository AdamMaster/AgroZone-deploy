import { maskEmail, maskPhone } from './mask.util'

describe('maskEmail', () => {
  it('оставляет два первых символа локальной части и домен', () => {
    expect(maskEmail('ivan.petrov@gmail.com')).toBe('iv***@gmail.com')
  })

  it('для коротких локальных частей показывает один символ, чтобы маска не раскрывала адрес', () => {
    expect(maskEmail('ab@mail.ru')).toBe('a***@mail.ru')
    expect(maskEmail('a@mail.ru')).toBe('a***@mail.ru')
  })

  it('обрезает пробелы по краям', () => {
    expect(maskEmail('  seller@mail.ru ')).toBe('se***@mail.ru')
  })

  it('при адресе с несколькими "@" ориентируется на последний', () => {
    expect(maskEmail('weird@name@mail.ru')).toBe('we***@mail.ru')
  })

  it.each(['', 'no-at-sign', '@mail.ru', 'user@'])('не-адрес %p целиком скрывает', value => {
    expect(maskEmail(value)).toBe('***')
  })

  it('никогда не возвращает исходный адрес целиком', () => {
    expect(maskEmail('ivan@mail.ru')).not.toContain('ivan@')
  })
})

describe('maskPhone', () => {
  it('оставляет код страны и последние 4 цифры', () => {
    expect(maskPhone('79991234567')).toBe('+7******4567')
  })

  it('работает с телефоном в формате с маской', () => {
    expect(maskPhone('+7 (999) 123-45-67')).toBe('+7******4567')
  })

  it('длина маски соответствует длине номера', () => {
    expect(maskPhone('375291234567')).toBe('+3*******4567')
  })

  it.each(['', '123', 'abc', '12345'])('слишком короткое значение %p целиком скрывает', value => {
    expect(maskPhone(value)).toBe('***')
  })

  it('не содержит средних цифр номера', () => {
    expect(maskPhone('79991234567')).not.toContain('999')
  })
})
