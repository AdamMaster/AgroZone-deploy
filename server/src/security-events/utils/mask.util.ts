// Маскирование контактов перед записью в журнал безопасности. Журнал нужен,
// чтобы понять ЧТО изменилось и КОГДА ("почта сменилась с iv***@gmail.com
// на ab***@mail.ru"), но сам не должен превращаться во второе хранилище
// персональных данных — поэтому полный адрес/номер в него не попадает
// (принцип минимизации данных, 152-ФЗ). Для расследования достаточно
// начала адреса и домена: по ним владелец узнаёт свой ящик.

// "ivan.petrov@gmail.com" -> "iv***@gmail.com". Для очень коротких
// локальных частей ("a@x.ru", "ab@x.ru") показываем только первый символ,
// иначе маска раскрывала бы адрес целиком.
export function maskEmail(email: string): string {
  const normalized = email.trim()
  const atIndex = normalized.lastIndexOf('@')

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return '***'
  }

  const local = normalized.slice(0, atIndex)
  const domain = normalized.slice(atIndex + 1)
  const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1)

  return `${visible}***@${domain}`
}

// "79991234567" (или "+7 (999) 123-45-67") -> "+7******4567": код страны и
// последние 4 цифры. Слишком короткую строку (не телефон) целиком скрываем.
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.length < 7) {
    return '***'
  }

  return `+${digits[0]}${'*'.repeat(digits.length - 5)}${digits.slice(-4)}`
}
