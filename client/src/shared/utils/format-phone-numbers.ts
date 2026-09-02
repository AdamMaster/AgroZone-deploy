export const formatPhoneNumber = (value: string, previousValue: string = '') => {
  if (!value) return value

  // Проверяем, удаляет ли пользователь символы
  const isDeleting = value.length < previousValue.length

  // Очищаем всё, кроме цифр
  const phoneNumber = value.replace(/\D/g, '')
  const phoneNumberLength = phoneNumber.length

  // Если стираем и осталась только семёрка или пусто — даём стереть до конца
  if (isDeleting && phoneNumberLength <= 1) {
    return value === '+' ? '+' : phoneNumber
  }

  if (phoneNumberLength < 2) return `+7`
  if (phoneNumberLength < 5) return `+7 (${phoneNumber.slice(1, 4)}`

  // Если стираем прямо на границе скобки ") ", не даем застрять
  if (isDeleting && phoneNumberLength === 4) return `+7 (${phoneNumber.slice(1, 4)}`

  if (phoneNumberLength < 8) return `+7 (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}`

  // Если стираем на границе первого дефиса
  if (isDeleting && phoneNumberLength === 7) return `+7 (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}`

  if (phoneNumberLength < 10)
    return `+7 (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}-${phoneNumber.slice(7, 9)}`

  // Если стираем на границе второго дефиса
  if (isDeleting && phoneNumberLength === 9)
    return `+7 (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}-${phoneNumber.slice(7, 9)}`

  return `+7 (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}-${phoneNumber.slice(7, 9)}-${phoneNumber.slice(9, 11)}`
}
