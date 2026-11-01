import { useRouter } from 'expo-router'
import { useEffect } from 'react'

// Адрес возврата после оплаты (agrozone://payment-return). Результат оплаты
// разбирает тот экран, с которого её начали (usePaymentCheckout): окно
// оплаты возвращает ему управление. На Android система дополнительно
// открывает приложение по этой ссылке, и роутер приводит сюда — экран сразу
// уходит назад, чтобы пользователь не увидел «страница не найдена».
export default function PaymentReturnScreen() {
  const router = useRouter()

  useEffect(() => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/')
    }
  }, [router])

  return null
}
