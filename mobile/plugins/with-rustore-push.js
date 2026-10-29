// Подключает RuStore Push к нативному проекту Android при prebuild (EAS Build).
// Готового плагина у RuStore для Expo нет, поэтому две вещи делаем сами:
//   1) id проекта push в AndroidManifest (по нему SDK инициализируется сам);
//   2) репозиторий RuStore в корневой build.gradle: SDK тянется оттуда, и его
//      должно видеть само приложение, а не только модуль modules/rustore-push.
// Id проекта — RuStore Консоль → приложение → Push-уведомления → Проекты → «ID
// проекта» (не секрет). Задаётся в app.json: ["./plugins/with-rustore-push",
// { "projectId": "..." }]. Пока он пуст, приложение собирается, но push не
// работают (токен получить не удастся).
const { withAndroidManifest, withProjectBuildGradle } = require('expo/config-plugins')

// Репозитории VK/RuStore: сам SDK push и его зависимость ru.ok.tracer (отчёты о
// сбоях SDK) лежат в разных местах; jitpack, стоящий в шаблоне Expo, на неё
// отвечает 401 и ломает сборку.
const REPOSITORY_URLS = [
  'https://nexus-external.rustore.ru/repository/maven-rustore-exposed/',
  'https://artifactory-external.vkpartner.ru/artifactory/maven'
]
const PROJECT_ID_META = 'ru.rustore.sdk.pushclient.project_id'

function addProjectId(config, projectId) {
  return withAndroidManifest(config, mod => {
    const application = mod.modResults.manifest.application?.[0]
    if (!application) return mod

    const metaData = (application['meta-data'] ??= [])
    const existing = metaData.find(item => item.$['android:name'] === PROJECT_ID_META)

    if (existing) {
      existing.$['android:value'] = projectId
    } else {
      metaData.push({ $: { 'android:name': PROJECT_ID_META, 'android:value': projectId } })
    }

    return mod
  })
}

function addRepository(config) {
  return withProjectBuildGradle(config, mod => {
    if (mod.modResults.language !== 'groovy') return mod

    // allprojects { repositories { ... } } — добавляем в начало списка.
    for (const url of REPOSITORY_URLS) {
      if (mod.modResults.contents.includes(url)) continue

      mod.modResults.contents = mod.modResults.contents.replace(
        /(allprojects\s*\{\s*repositories\s*\{)/,
        `$1\n    maven { url '${url}' }`
      )
    }

    return mod
  })
}

module.exports = function withRuStorePush(config, props = {}) {
  const projectId = typeof props.projectId === 'string' ? props.projectId.trim() : ''

  // Репозиторий нужен всегда: модуль modules/rustore-push подключается к
  // сборке автоматически, и без репозитория Gradle не найдёт его зависимость.
  config = addRepository(config)

  if (!projectId) {
    console.warn('[with-rustore-push] projectId не задан в app.json — push RuStore работать не будут')
    return config
  }

  return addProjectId(config, projectId)
}
