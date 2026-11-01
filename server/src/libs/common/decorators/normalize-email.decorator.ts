import { Transform } from 'class-transformer'

import { normalizeEmail } from '../utils/email.util'

// Поле DTO с почтой: приводится к единому виду до проверки формата (см.
// normalizeEmail). Срабатывает, потому что ValidationPipe работает с
// transform: true.
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? normalizeEmail(value) : value))

// Поле, где может быть и почта, и телефон (вход, «есть ли такой
// пользователь»): почту нормализуем, телефон оставляем как есть — его
// разбирает normalizePhone.
export const NormalizeLoginIdentifier = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.includes('@') ? normalizeEmail(value) : value
  )
