export class FetchError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// Сообщения для случаев, когда сервер не вернул своего текста ошибки. Формат
// "Заголовок. Пояснение" — toastMessageHandler делит строку по первой точке на
// заголовок и описание тоста.
//
// Без них пользователь видит голое "Failed to fetch" (браузер так называет
// любой обрыв запроса) или "Unexpected token '<'" (когда nginx вместо JSON
// отвечает HTML-страницей ошибки) — по ним невозможно понять, что делать.
export const NETWORK_ERROR_MESSAGE = 'Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз'
export const OFFLINE_ERROR_MESSAGE = 'Нет подключения к интернету. Проверьте соединение и попробуйте ещё раз'

const STATUS_ERROR_MESSAGES: Partial<Record<number, string>> = {
  408: 'Превышено время ожидания. Проверьте интернет и попробуйте ещё раз',
  413: 'Слишком большой объём данных. Уменьшите количество или размер файлов и попробуйте снова',
  502: 'Сервер временно недоступен. Попробуйте через минуту',
  503: 'Сервер временно недоступен. Попробуйте через минуту',
  504: 'Сервер не успел ответить. Попробуйте ещё раз'
}

export const getStatusErrorMessage = (status: number, statusText: string) =>
  STATUS_ERROR_MESSAGES[status] || statusText || 'Ошибка со стороны сервера'
