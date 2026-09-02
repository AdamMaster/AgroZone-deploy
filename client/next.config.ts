import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // standalone — для докера: сборка кладёт в .next/standalone минимальный
  // самодостаточный сервер (только реально используемые зависимости из
  // node_modules, без dev-хвостов), которого достаточно, чтобы поднять
  // `node server.js` без npm install внутри финального образа. Без этого
  // пришлось бы тащить в рантайм-образ весь node_modules — и по размеру,
  // и по времени сборки/деплоя ощутимо хуже (см. обсуждение с
  // пользователем про перенос на Selectel).
  output: 'standalone',
  reactCompiler: process.env.NODE_ENV === 'production',
  env: {
    SERVER_URL: process.env.SERVER_URL,
    GOOGLE_RECAPTCHA_SITE_KEY: process.env.GOOGLE_RECAPTCHA_SITE_KEY
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.twcstorage.ru',
        port: '',
        pathname: '/**'
      }
    ]
  }
}

export default nextConfig
