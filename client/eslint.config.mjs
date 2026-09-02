import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { defineConfig, globalIgnores } from 'eslint/config'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Отключаем проверку кейса для имен классов (чтобы не ругался на BEM)
      'bem/bem-names': 'off',
      // Если стоит плагин на каноничные классы, гасим его здесь
      'tailwind/suggest-canonical-classes': 'off',
      // Иногда ругается на "неизвестные" слова в скобках [420px]
      '@next/next/no-duplicate-head': 'off' // это просто пример, если будут другие ошибки
    }
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts'])
])

export default eslintConfig
