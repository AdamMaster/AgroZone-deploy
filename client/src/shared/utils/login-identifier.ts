const MIN_PHONE_DIGITS = 10

// Что набрано в поле «Почта или номер телефона»: почта (есть «@»), номер
// (не меньше 10 цифр) или пока непонятно. Нужно, чтобы переносить введённое
// между формами входа, регистрации и сброса пароля — в нужное поле.
export const parseLoginIdentifier = (value?: string): { email?: string; phone?: string } => {
  const trimmed = value?.trim()

  if (!trimmed) return {}
  if (trimmed.includes('@')) return { email: trimmed }

  return trimmed.replace(/\D/g, '').length >= MIN_PHONE_DIGITS ? { phone: trimmed } : {}
}
