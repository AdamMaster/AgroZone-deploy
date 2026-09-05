import { MetadataRoute } from 'next'

import { LEGAL_DETAILS } from '@/components/features/legal/legal-details'

const SITE_URL = `https://${LEGAL_DETAILS.siteUrl}`

// Закрываем от индексации всё, что не имеет смысла показывать в поиске и
// местами даже вредно там показывать: личный кабинет и формы подачи/
// редактирования объявлений — приватные данные и дублирующийся с публичной
// карточкой контент; служебные auth-страницы (change-email, new-password,
// new-verification) обычно открываются по одноразовой ссылке с токеном в
// query — индексировать их нет смысла и небезопасно; /admin — панель
// модерации, публике не нужна вовсе.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/profile',
        '/profile/*',
        '/ads/create',
        '/ads/*/edit',
        '/ads/*/promote',
        '/ads/*/stats',
        '/admin',
        '/admin/*',
        '/change-email',
        '/new-password',
        '/new-verification'
      ]
    },
    sitemap: `${SITE_URL}/sitemap.xml`
  }
}
