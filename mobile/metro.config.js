const { getDefaultConfig } = require('expo/metro-config')
const { withUniwindConfig } = require('uniwind/metro')

const config = getDefaultConfig(__dirname)

// withUniwindConfig должен оставаться самой внешней обёрткой конфига Metro
// (требование Uniwind): он компилирует global.css в нативные стили на этапе
// сборки и генерирует типы классов в src/uniwind-types.d.ts.
module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts'
})
