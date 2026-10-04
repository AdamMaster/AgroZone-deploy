import { buildDayKeys, startOfDayUtc, toDayKey } from './dashboard-days.util'

describe('dashboard-days.util', () => {
  describe('toDayKey', () => {
    it('даёт календарный день по Москве, а не по UTC', () => {
      // 22:30 UTC 4 октября — это уже 01:30 5 октября по Москве.
      expect(toDayKey(new Date('2026-10-04T22:30:00Z'))).toBe('2026-10-05')
      expect(toDayKey(new Date('2026-10-04T20:59:59Z'))).toBe('2026-10-04')
    })
  })

  describe('buildDayKeys', () => {
    it('возвращает дни по возрастанию, последний — день "сейчас"', () => {
      expect(buildDayKeys(new Date('2026-10-04T10:00:00Z'), 3)).toEqual(['2026-10-02', '2026-10-03', '2026-10-04'])
    })

    it('считает "сегодня" по Москве', () => {
      expect(buildDayKeys(new Date('2026-10-04T22:30:00Z'), 2)).toEqual(['2026-10-04', '2026-10-05'])
    })

    it('переходит через границу месяца и года', () => {
      expect(buildDayKeys(new Date('2026-03-02T09:00:00Z'), 4)).toEqual([
        '2026-02-27',
        '2026-02-28',
        '2026-03-01',
        '2026-03-02'
      ])
      expect(buildDayKeys(new Date('2027-01-01T09:00:00Z'), 2)).toEqual(['2026-12-31', '2027-01-01'])
    })

    it('возвращает ровно запрошенное число дней', () => {
      expect(buildDayKeys(new Date('2026-10-04T10:00:00Z'), 90)).toHaveLength(90)
    })
  })

  describe('startOfDayUtc', () => {
    it('переводит начало московского дня в UTC', () => {
      expect(startOfDayUtc('2026-10-05').toISOString()).toBe('2026-10-04T21:00:00.000Z')
    })
  })
})
