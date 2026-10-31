import { formatDaysCount } from './format-days-count.util'

describe('formatDaysCount', () => {
  it.each([
    [1, '1 день'],
    [2, '2 дня'],
    [3, '3 дня'],
    [4, '4 дня'],
    [5, '5 дней'],
    [11, '11 дней'],
    [12, '12 дней'],
    [14, '14 дней'],
    [21, '21 день'],
    [22, '22 дня'],
    [25, '25 дней'],
    [111, '111 дней']
  ])('%i → %s', (count, expected) => {
    expect(formatDaysCount(count)).toBe(expected)
  })
})
