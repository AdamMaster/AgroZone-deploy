import { toast } from 'sonner-native'

// Ошибка запроса уведомлением — общий onError мутаций: текст берётся из
// ответа сервера (ApiError.message).
export const showError = (error: Error) => toast.error(error.message)
