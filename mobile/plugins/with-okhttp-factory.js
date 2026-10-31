// Подключает HTTP-клиент приложения (modules/network-resilience) вместо
// стандартного клиента React Native. Автоподключение модулей Expo не умеет
// менять MainApplication, поэтому фабрику клиента регистрируем здесь, при
// prebuild. Регистрация должна пройти до первого сетевого запроса, поэтому
// строка ставится сразу после super.onCreate().
const { withMainApplication } = require('expo/config-plugins')

const FACTORY_IMPORT = 'import com.facebook.react.modules.network.OkHttpClientProvider'
const MODULE_IMPORT = 'import expo.modules.networkresilience.AgroOkHttpClientFactory'
const REGISTRATION = '    OkHttpClientProvider.setOkHttpClientFactory(AgroOkHttpClientFactory)'

module.exports = function withOkHttpFactory(config) {
  return withMainApplication(config, mod => {
    if (mod.modResults.language !== 'kt') {
      throw new Error('with-okhttp-factory: ожидается MainApplication.kt')
    }

    let contents = mod.modResults.contents
    if (contents.includes('AgroOkHttpClientFactory')) return mod

    if (!/super\.onCreate\(\)/.test(contents)) {
      throw new Error('with-okhttp-factory: в MainApplication.kt не найден super.onCreate()')
    }

    contents = contents.replace(/(import android\.app\.Application\s*\n)/, `$1${FACTORY_IMPORT}\n${MODULE_IMPORT}\n`)
    contents = contents.replace(/(super\.onCreate\(\)\s*\n)/, `$1${REGISTRATION}\n`)

    mod.modResults.contents = contents
    return mod
  })
}
