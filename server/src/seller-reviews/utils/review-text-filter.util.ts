import { SellerReviewFilterFlag } from '@/generated/prisma/enums'

// Автофильтр текста отзыва: ловит то, что почти всегда означает спам,
// оскорбление или попытку увести разговор с площадки. Срабатывание не
// отклоняет отзыв, а отправляет его на проверку модератору — ложные
// срабатывания обходятся дорого только временем модератора, а не потерей
// честного отзыва.

// Латиница, внешне неотличимая от кириллицы: «хyй» с латинской «y» —
// стандартный способ обойти фильтр.
const LOOKALIKES: Record<string, string> = {
  a: 'а',
  e: 'е',
  o: 'о',
  p: 'р',
  c: 'с',
  x: 'х',
  y: 'у',
  k: 'к',
  m: 'м',
  t: 'т'
}

// Слово начинается не посреди другого слова: у кириллицы \b в JS не работает.
const START = '(?<![а-я])'
const END = '(?![а-я])'

// Корни и устойчивые формы, а не просто подстроки: «ебл» нельзя брать —
// оно есть в «употреблять», а «хуй» без границы слова — в «хуйня» (это
// ловим) и ни в чём безобидном. Каждый шаблон проверен тестами на
// безобидных словах.
const PROFANITY_PATTERNS: RegExp[] = [
  new RegExp(`${START}(?:на|по|за|не|от|ни|до|вы|рас)?ху[йеяию]`),
  new RegExp('пизд'),
  new RegExp(
    `${START}(?:за|на|вы|по|при|от|до|раз|съ|объ|под|про|пере|у|долбо|ъ)?еб(?:ан|ат|ал|ну|ут|ет|ись|ыч|у${END}|и${END})`
  ),
  new RegExp(`${START}(?:на|по|за|с|е)?бля(?:д|ть)`),
  new RegExp(`${START}су(?:ка|ки|ку|ке|кой|чка|чара|чий)${END}`),
  new RegExp('муд(?:ак|ил|озв)'),
  new RegExp('пид[оа]р|пидр'),
  new RegExp('залуп|гандон|гондон|шлюх|ублюд')
]

const LINK_PATTERNS: RegExp[] = [
  /https?:\/\//,
  /\bwww\./,
  /\b(?:t\.me|wa\.me|vk\.com|vk\.cc|bit\.ly|instagram\.com|youtu\.be)\b/,
  // Имя пользователя мессенджера: @name.
  /(?:^|\s)@[a-z0-9_]{4,}/,
  // Голый домен: site.ru, shop.com и т. п.
  /\b[a-z0-9-]{2,}\.(?:ru|com|рф|net|org|su|me|io|ly|xyz|shop|store|online|site|pro|info|biz)\b/
]

// От десяти цифр подряд (допускаются пробелы, дефисы, скобки и точки между
// ними): телефон. Цена или объём столько цифр не дают.
const PHONE_PATTERN = /(?:\+?\d[\s\-().]{0,2}){10,}/

const normalizeForProfanity = (text: string) =>
  text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[a-z]/g, char => LOOKALIKES[char] ?? char)
    // «хуууй» → «хуй»
    .replace(/(.)\1{2,}/g, '$1')

// Флаги, которые можно получить по одному тексту. Повтор текста у других
// отзывов требует базы и определяется отдельно (SellerReviewTextFilterService).
export function detectTextFlags(text: string | null | undefined): SellerReviewFilterFlag[] {
  if (!text) {
    return []
  }

  const flags: SellerReviewFilterFlag[] = []
  const lower = text.toLowerCase()
  const normalized = normalizeForProfanity(text)

  if (PROFANITY_PATTERNS.some(pattern => pattern.test(normalized))) {
    flags.push(SellerReviewFilterFlag.PROFANITY)
  }

  if (LINK_PATTERNS.some(pattern => pattern.test(lower))) {
    flags.push(SellerReviewFilterFlag.LINK)
  }

  if (PHONE_PATTERN.test(text)) {
    flags.push(SellerReviewFilterFlag.PHONE)
  }

  return flags
}
