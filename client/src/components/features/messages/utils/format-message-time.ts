// Сегодняшние сообщения — просто время (собеседнику важнее "во сколько",
// чем "какого числа"), более старые — дата без года (в переписке за один
// год года не нужны, а если чат проживёт больше — не страшно, это просто
// вывод, не логика).
export function formatMessageTime(value: string | Date): string {
  const date = new Date(value)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date)
  }

  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date)
}
