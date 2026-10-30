/* global __dirname */
// Дополняет app.json: подключает Firebase (FCM), только если рядом лежит
// google-services.json (Firebase Console → Project settings → Your apps →
// Android → google-services.json). Файл в git не хранится. Без него приложение
// собирается как раньше и использует только RuStore Push.
const fs = require('node:fs')
const path = require('node:path')

const GOOGLE_SERVICES_FILE = './google-services.json'

module.exports = ({ config }) => {
  const hasGoogleServices = fs.existsSync(path.join(__dirname, GOOGLE_SERVICES_FILE))

  if (!hasGoogleServices) {
    console.warn('[app.config] google-services.json не найден — push через Firebase (FCM) не будут работать')
    return config
  }

  return { ...config, android: { ...config.android, googleServicesFile: GOOGLE_SERVICES_FILE } }
}
