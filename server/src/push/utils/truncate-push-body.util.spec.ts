import { truncatePushBody } from './truncate-push-body.util'

describe('truncatePushBody', () => {
  it('короткий текст остаётся как есть', () => {
    expect(truncatePushBody('Привет')).toBe('Привет')
  })

  it('текст ровно в лимит не обрезается', () => {
    expect(truncatePushBody('а'.repeat(120))).toBe('а'.repeat(120))
  })

  it('длинный текст обрезается по умолчанию до 120 символов с многоточием', () => {
    expect(truncatePushBody('а'.repeat(121))).toBe(`${'а'.repeat(120)}…`)
  })

  it('лимит можно задать', () => {
    expect(truncatePushBody('абвгде', 3)).toBe('абв…')
  })
})
