import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js/min'

const MAX_PHONE_DIGITS = 15

// Российская маска "+7 (999) 999-99-99" — основной случай, формат прежний.
const formatRussianPhone = (digits: string, isDeleting: boolean) => {
  const length = digits.length

  if (length < 2) return `+7`
  if (length < 5) return `+7 (${digits.slice(1, 4)}`

  // Если стираем прямо на границе скобки ") ", не даем застрять
  if (isDeleting && length === 4) return `+7 (${digits.slice(1, 4)}`

  if (length < 8) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}`

  // Если стираем на границе первого дефиса
  if (isDeleting && length === 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}`

  if (length < 10) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}`

  // Если стираем на границе второго дефиса
  if (isDeleting && length === 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}`

  return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
}

// Поле телефона для всех стран. Что набрал пользователь, то и определяет маску:
//  - номер начинается с 7 или 8, либо с 9 (российский мобильный без кода) —
//    российская маска "+7 (999) 999-99-99", как и раньше;
//  - любая другая первая цифра, либо явный «+» с кодом не из России
//    ("+375 29 123-45-67", "+420 601 123 456") — международный формат,
//    который расставляет libphonenumber-js по правилам страны.
// Номера из базы приходят голыми цифрами без «+» ("375291234567") — они
// тоже форматируются по этим правилам.
export const formatPhoneNumber = (value: string, previousValue: string = '') => {
  if (!value) return value

  const hasPlus = value.trim().startsWith('+')
  const isDeleting = value.length < previousValue.length

  // Очищаем всё, кроме цифр
  const digits = value.replace(/\D/g, '').slice(0, MAX_PHONE_DIGITS)

  // Только «+» без цифр: оставляем плюс, чтобы можно было набрать любой код
  // страны (раньше поле сразу превращало его в "+7").
  if (digits.length === 0) return hasPlus ? '+' : ''

  // Если стираем и осталась только одна цифра — даём стереть до конца
  if (isDeleting && digits.length <= 1) return value === '+' ? '+' : digits

  const first = digits[0]

  // Явный «+7» и номера с 7/8 без плюса — Россия/Казахстан (код +7)
  if (first === '7' || (first === '8' && !hasPlus)) {
    return formatRussianPhone(digits, isDeleting)
  }

  // "999 123-45-67" без кода — российский мобильный
  if (first === '9' && !hasPlus) {
    return formatRussianPhone(`7${digits}`.slice(0, 11), isDeleting)
  }

  // Всё остальное — международный номер
  return new AsYouType().input(`+${digits}`)
}

const RUSSIAN_PHONE_FORMAT = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/

// Валидация значения из поля телефона: российский номер должен быть введён
// полностью по маске, остальные страны — корректным международным номером.
export const isValidPhone = (value: string) => {
  if (RUSSIAN_PHONE_FORMAT.test(value)) return true
  if (value.startsWith('+7')) return false

  return parsePhoneNumberFromString(value)?.isValid() ?? false
}

// Телефон для отправки на сервер: "+" и цифры без пробелов и скобок.
// Плюс нужен, чтобы сервер не принял иностранный номер на «8» за российский.
export const phoneToApi = (value: string) => `+${value.replace(/\D/g, '')}`
