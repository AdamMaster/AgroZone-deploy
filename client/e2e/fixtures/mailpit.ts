// Клиент к REST API локального Mailpit (см. server/docker-compose.test.yml —
// сервис mailpit, SMTP на 1025 совпадает с MAIL_HOST/MAIL_PORT в
// server/.env.test, HTTP API на 8025). Использует Mailpit REST API v1:
// GET /api/v1/messages   — список последних писем (без полного тела)
// GET /api/v1/message/:ID — одно письмо целиком (HTML/Text)
//
// ВАЖНО (см. e2e/README.md): это ЕДИНСТВЕННОЕ место в тестах, форма
// запроса которого не проверена реальным запуском Mailpit (сеть до
// localhost недоступна из окружения, где писался этот файл) — сама форма
// REST API v1 соответствует официальной документации Mailpit на момент
// написания, но при первом реальном прогоне стоит явно свериться, что
// ответ /api/v1/messages действительно содержит поле "messages" с
// элементами, у которых есть "ID" и "To[].Address" именно в таком регистре.
const MAILPIT_BASE_URL = 'http://localhost:8025'

interface MailpitAddress {
  Address: string
}

interface MailpitMessageSummary {
  ID: string
  To: MailpitAddress[]
  Subject: string
}

interface MailpitMessagesListResponse {
  messages: MailpitMessageSummary[]
}

interface MailpitFullMessage {
  ID: string
  HTML: string
  Text: string
}

async function fetchLatestConfirmationPath(toAddress: string): Promise<string> {
  const listResponse = await fetch(`${MAILPIT_BASE_URL}/api/v1/messages`)

  if (!listResponse.ok) {
    throw new Error(
      `Mailpit недоступен на ${MAILPIT_BASE_URL} (${listResponse.status}). ` +
        'Убедитесь, что контейнер mailpit запущен: docker compose -f docker-compose.yml -f docker-compose.test.yml up -d'
    )
  }

  const list = (await listResponse.json()) as MailpitMessagesListResponse

  // Mailpit отдаёт письма от новых к старым — при повторных прогонах
  // (например, если email-change.spec.ts запускали несколько раз подряд
  // без очистки почтового ящика) find() возьмёт именно последнее письмо на
  // этот адрес.
  const summary = list.messages?.find(message => message.To?.some(to => to.Address === toAddress))

  if (!summary) {
    throw new Error(`Письмо для ${toAddress} пока не найдено в Mailpit (список из ${list.messages?.length ?? 0} писем)`)
  }

  const fullResponse = await fetch(`${MAILPIT_BASE_URL}/api/v1/message/${summary.ID}`)

  if (!fullResponse.ok) {
    throw new Error(`Не удалось получить письмо ${summary.ID} из Mailpit (${fullResponse.status})`)
  }

  const full = (await fullResponse.json()) as MailpitFullMessage
  const body = full.HTML || full.Text || ''

  // См. server/src/libs/mail/templates/email-change.tamplate.tsx:
  // confirmLink = `${ALLOWED_ORIGIN}/change-email?token=${token}` — то есть
  // ссылка ведёт на КЛИЕНТСКУЮ страницу /change-email (которая сама уже
  // дергает POST auth/email-change/confirm?token=... — см.
  // client/src/components/features/user/services/email-change.service.ts).
  const match = body.match(/\/change-email\?token=[^"'&\s<]+/)

  if (!match) {
    throw new Error(
      `В письме ${summary.ID} не нашлась ссылка подтверждения (/change-email?token=...). Тело письма: ${body.slice(0, 500)}`
    )
  }

  return match[0]
}

/**
 * Ждёт письмо о смене почты для указанного адреса и возвращает относительный
 * путь ссылки подтверждения (например "/change-email?token=..."), готовый
 * для page.goto(). Опрашивает Mailpit с интервалом, а не спит фиксированное
 * время — локальная доставка обычно мгновенная, но лишняя устойчивость к
 * дребезгу не помешает.
 */
export async function waitForEmailChangeConfirmationPath(toAddress: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown

  while (Date.now() < deadline) {
    try {
      return await fetchLatestConfirmationPath(toAddress)
    } catch (error) {
      lastError = error
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Письмо для ${toAddress} так и не пришло за ${timeoutMs}мс`)
}
