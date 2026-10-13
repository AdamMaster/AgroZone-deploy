const MIN_PHONE_DIGITS = 10

// Что набрано в поле «Телефон или почта» формы входа: почта (есть «@»),
// номер (не меньше 10 цифр) или пока непонятно. Нужен, чтобы перенести
// введённое на экран сброса пароля — в нужное поле нужного способа.
export function parseLoginIdentifier(value?: string): { email?: string; phone?: string } {
  const trimmed = value?.trim()

  if (!trimmed) return {}
  if (trimmed.includes('@')) return { email: trimmed }

  return trimmed.replace(/\D/g, '').length >= MIN_PHONE_DIGITS ? { phone: trimmed } : {}
}
