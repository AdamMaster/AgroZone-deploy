import { hasCoordinates } from './has-coordinates.util'

describe('hasCoordinates', () => {
  it('настоящая точка', () => {
    expect(hasCoordinates(55.75, 37.61)).toBe(true)
  })

  it('(0, 0) — точки нет', () => {
    expect(hasCoordinates(0, 0)).toBe(false)
  })

  it('ноль по одной оси — это всё ещё точка (экватор, нулевой меридиан)', () => {
    expect(hasCoordinates(0, 37.61)).toBe(true)
    expect(hasCoordinates(55.75, 0)).toBe(true)
  })

  it.each([
    [NaN, 10],
    [10, Infinity],
    [91, 10],
    [10, 181],
    [undefined, 10],
    [10, null],
    ['55.7', '37.6']
  ])('мусор (%p, %p) — точки нет', (lat, lng) => {
    expect(hasCoordinates(lat, lng)).toBe(false)
  })
})
