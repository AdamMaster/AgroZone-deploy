import type { AdDetailView } from '@/features/ads/hooks/use-ad-detail'

// Куда ведёт уведомление в приложении. Сервер хранит ссылку на страницу
// сайта (link), её и переводим в экран приложения.
type NotificationTarget =
  | { kind: 'ad'; id: string; view: AdDetailView }
  | { kind: 'conversation'; id: string }
  | { kind: 'seller'; id: string; tab?: 'reviews' }
  | { kind: 'messages' }
  | { kind: 'site'; path: `/${string}` }

// /ads/{id} — публичная страница; /ads/{id}/my и /ads/{id}/edit (например,
// отклонённое объявление) — страница владельца: публичная у снятого или
// отклонённого объявления отдаёт 404.
const AD_LINK = /^\/ads\/([^/?#]+)(?:\/(my|edit))?\/?(?:[?#].*)?$/
// /profile/settings/messages?c={id} — новое сообщение в диалоге.
const MESSAGES_LINK = /^\/profile\/settings\/messages(?:[/?#].*)?$/
const CONVERSATION_PARAM = /[?&]c=([^&#]+)/
// /sellers/{id} — страница продавца; ?tab=reviews — её вкладка «Отзывы» (так
// ведут уведомления о новом отзыве и об ответе продавца).
const SELLER_LINK = /^\/sellers\/([^/?#]+)\/?(\?[^#]*)?(?:#.*)?$/

export function resolveNotificationTarget(link: string | null): NotificationTarget | null {
  if (!link?.startsWith('/')) return null

  const ad = AD_LINK.exec(link)
  if (ad) return { kind: 'ad', id: decodeURIComponent(ad[1]), view: ad[2] ? 'owner' : 'public' }

  const seller = SELLER_LINK.exec(link)
  if (seller) {
    return {
      kind: 'seller',
      id: decodeURIComponent(seller[1]),
      tab: /[?&]tab=reviews(?:&|$)/.test(seller[2] ?? '') ? 'reviews' : undefined
    }
  }

  if (MESSAGES_LINK.test(link)) {
    const conversation = CONVERSATION_PARAM.exec(link)
    return conversation ? { kind: 'conversation', id: decodeURIComponent(conversation[1]) } : { kind: 'messages' }
  }

  // Раздела, на который ссылается уведомление, в приложении нет — открываем
  // страницу сайта.
  return { kind: 'site', path: link as `/${string}` }
}
