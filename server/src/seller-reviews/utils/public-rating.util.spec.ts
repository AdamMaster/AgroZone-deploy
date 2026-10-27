import { buildPublicRating, publicRatingFields } from './public-rating.util'

describe('buildPublicRating', () => {
  it('от трёх отзывов отдаёт среднее и количество', () => {
    expect(buildPublicRating({ ratingAverage: 4.33, ratingCount: 3 })).toEqual({ average: 4.33, count: 3 })
  })

  it('меньше трёх отзывов среднее скрыто, количество видно', () => {
    expect(buildPublicRating({ ratingAverage: 5, ratingCount: 2 })).toEqual({ average: null, count: 2 })
  })

  it('без отзывов — пусто', () => {
    expect(buildPublicRating({ ratingAverage: null, ratingCount: 0 })).toEqual({ average: null, count: 0 })
  })
})

describe('publicRatingFields', () => {
  const stored = { ratingAverage: 4.5, ratingCount: 10 }

  it('рейтинги выключены — пустой объект, ключа rating нет вовсе', () => {
    const fields = publicRatingFields(stored, false)

    expect(fields).toEqual({})
    expect(fields).not.toHaveProperty('rating')
  })

  it('рейтинги включены — готовый rating', () => {
    expect(publicRatingFields(stored, true)).toEqual({ rating: { average: 4.5, count: 10 } })
  })
})
