import { BadRequestException } from '@nestjs/common'
import { getPhoneCountry, isPossiblePhone, normalizePhone, parseAllowedCountries } from './phone.util'

describe('phone.util', () => {
  describe('normalizePhone', () => {
    it('оставляет только цифры', () => {
      expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567')
      expect(normalizePhone('+375 29 123-45-67')).toBe('375291234567')
    })

    it('российская запись с 8 без плюса приводится к 7', () => {
      expect(normalizePhone('8 (999) 123-45-67')).toBe('79991234567')
      expect(normalizePhone('89991234567')).toBe('79991234567')
    })

    it('с плюсом «8» не трогается — это не россиянин (Вьетнам)', () => {
      expect(normalizePhone('+84 91 234 56 78')).toBe('84912345678')
    })

    it('отклоняет слишком короткие и слишком длинные номера', () => {
      expect(() => normalizePhone('12345')).toThrow(BadRequestException)
      expect(() => normalizePhone('1234567890123456')).toThrow(BadRequestException)
    })
  })

  describe('getPhoneCountry', () => {
    it.each([
      ['79991234567', 'RU'],
      ['77012345678', 'KZ'],
      ['375291234567', 'BY'],
      ['420601123456', 'CZ'],
      ['37129123456', 'LV']
    ])('%s -> %s', (phone, country) => {
      expect(getPhoneCountry(phone)).toBe(country)
    })
  })

  describe('isPossiblePhone', () => {
    it('принимает нормальные номера и отклоняет мусор', () => {
      expect(isPossiblePhone('375291234567')).toBe(true)
      expect(isPossiblePhone('79991234567')).toBe(true)
      expect(isPossiblePhone('7999')).toBe(false)
    })
  })

  describe('parseAllowedCountries', () => {
    it('разбирает список, игнорируя регистр и пробелы', () => {
      expect(parseAllowedCountries(' ru, by ,kz ')).toEqual(['RU', 'BY', 'KZ'])
    })

    it('пустое значение — без ограничения', () => {
      expect(parseAllowedCountries(undefined)).toBeNull()
      expect(parseAllowedCountries('')).toBeNull()
    })
  })
})
