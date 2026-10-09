import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js/min'

// Ввод и проверка телефона — те же правила, что на сайте
// (client/src/shared/utils/format-phone-numbers.ts), чтобы номер, который
// принимает сайт, принимало и приложение, и наоборот.

const MAX_PHONE_DIGITS = 15

const formatRussianPhone = (digits: string, isDeleting: boolean) => {
  const length = digits.length

  if (length < 2) return `+7`
  if (length < 5) return `+7 (${digits.slice(1, 4)}`
  if (isDeleting && length === 4) return `+7 (${digits.slice(1, 4)}`
  if (length < 8) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}`
  if (isDeleting && length === 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}`
  if (length < 10) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}`
  if (isDeleting && length === 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}`

  return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
}

// Маска при вводе: «+7 (999) 123-45-67» для российских номеров (в том числе
// введённых с 8 или сразу с 9), международный формат — для остальных.
export const formatPhoneInput = (value: string, previousValue = ''): string => {
  if (!value) return value

  const hasPlus = value.trim().startsWith('+')
  const isDeleting = value.length < previousValue.length
  const digits = value.replace(/\D/g, '').slice(0, MAX_PHONE_DIGITS)

  if (digits.length === 0) return hasPlus ? '+' : ''
  if (isDeleting && digits.length <= 1) return value === '+' ? '+' : digits

  const first = digits[0]

  if (first === '7' || (first === '8' && !hasPlus)) return formatRussianPhone(digits, isDeleting)
  if (first === '9' && !hasPlus) return formatRussianPhone(`7${digits}`.slice(0, 11), isDeleting)

  return new AsYouType().input(`+${digits}`)
}

const RUSSIAN_PHONE_FORMAT = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/

export const isValidPhone = (value: string): boolean => {
  if (RUSSIAN_PHONE_FORMAT.test(value)) return true
  if (value.startsWith('+7')) return false

  return parsePhoneNumberFromString(value)?.isValid() ?? false
}

// Номер в виде, который ждёт сервер: «+79991234567».
export const phoneToApi = (value: string): string => `+${value.replace(/\D/g, '')}`

// Номер из профиля («+79991234567») — для показа: «+7 999 123-45-67».
export const formatPhoneForDisplay = (phone: string): string =>
  parsePhoneNumberFromString(phone)?.formatInternational() ?? phone
