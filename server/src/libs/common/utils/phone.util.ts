import { BadRequestException } from '@nestjs/common'
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min'

// Приводит номер к виду "только цифры, с кодом страны" ("79991234567",
// "375291234567") — в таком виде номера хранятся в базе.
//
// Правило «8 → 7» (российская запись "8 (999) ..." вместо "+7 (999) ...")
// применяется только к номерам БЕЗ плюса. С плюсом код страны уже указан
// явно, и 11-значный номер на «8» — это не россиянин (например, Вьетнам
// "+84 91 234 56 78").
export function normalizePhone(phone: string) {
  const hasPlus = phone.trim().startsWith('+')
  let normalized = phone.replace(/\D/g, '')

  if (!hasPlus && normalized.length === 11 && normalized.startsWith('8')) {
    normalized = '7' + normalized.slice(1)
  }

  if (normalized.length < 10 || normalized.length > 15) {
    throw new BadRequestException('Некорректный номер телефона')
  }

  return normalized
}

// Страна номера, заданного цифрами с кодом страны ("375291234567" -> "BY").
// Для кода +7 (Россия и Казахстан) страна определяется по первым цифрам
// номера. Если определить не удалось — undefined.
export function getPhoneCountry(normalizedPhone: string): CountryCode | undefined {
  return parsePhoneNumberFromString(`+${normalizedPhone}`)?.country
}

// Номер "возможен" по длине и коду страны (без проверки диапазонов
// оператора — они у номеров часто меняются, а sms.ru всё равно сам
// отклонит несуществующий номер).
export function isPossiblePhone(normalizedPhone: string): boolean {
  return Boolean(parsePhoneNumberFromString(`+${normalizedPhone}`)?.isPossible())
}

// Разбирает необязательный список стран из PHONE_ALLOWED_COUNTRIES
// ("RU,BY,KZ"). Пустое значение — null: ограничения нет, принимаются номера
// любых стран.
export function parseAllowedCountries(value: string | undefined): CountryCode[] | null {
  const countries = (value ?? '')
    .split(',')
    .map(item => item.trim().toUpperCase())
    .filter(Boolean) as CountryCode[]

  return countries.length ? countries : null
}
