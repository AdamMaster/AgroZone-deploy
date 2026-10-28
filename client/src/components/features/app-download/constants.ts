// Страница приложения AgroZone в RuStore. Приложение выходит только под Android
// (для iOS его нет), поэтому ссылка на магазин — единственный способ установки.
export const RUSTORE_APP_URL = 'https://www.rustore.ru/catalog/app/ru.agrozone.app'

// Картинка с QR-кодом на RUSTORE_APP_URL (public/images). Это статичный SVG, а не
// рисуется на лету: адрес не меняется, зато не нужна библиотека. Если ссылка
// поменяется — QR нужно сгенерировать заново.
export const RUSTORE_APP_QR_SRC = '/images/rustore-app-qr.svg'
