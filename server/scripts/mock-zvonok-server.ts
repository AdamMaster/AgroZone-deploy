// Локальный мок настоящего API zvonok.com — ТОЛЬКО для E2E-тестов
// (Playwright). Настоящий zvonok — платный внешний сервис реальных звонков;
// гонять по нему автотесты нельзя (и дорого, и никто физически не позвонит
// с "тестового" номера). Этот мок отвечает в точно том же формате, что и
// настоящий zvonok (см. server/src/libs/zvonok/zvonok.service.ts), поэтому
// ZvonokService не замечает подмены — достаточно направить
// ZVONOK_API_BASE_URL (в .env.test) на этот сервер вместо https://zvonok.com.
//
// Имитируемый сценарий: пользователь "звонит" на выданный номер не сразу, а
// через небольшую паузу — так E2E-тест по-настоящему проверяет, что фронт
// корректно ждёт и опрашивает статус, а не просто получает "подтверждено"
// с первого же запроса.
//
// Запуск: dotenv -e .env.test -- ts-node scripts/mock-zvonok-server.ts
// (см. npm-скрипт test:e2e:mock-zvonok в package.json)

import { createServer, IncomingMessage, ServerResponse } from 'http'

const PORT = Number(process.env.ZVONOK_MOCK_PORT) || 4100

// Через сколько миллисекунд после запроса "confirm" звонок считать
// поступившим. Держим небольшим, но не нулевым — см. комментарий выше.
const CONFIRM_DELAY_MS = 1500

interface PendingCall {
  callId: string
  readyAt: number
}

// phone -> ожидающий подтверждения звонок. В реальном zvonok это, конечно,
// хранится у них на сервере — здесь достаточно инстанса процесса, так как
// мок живёт ровно на время прогона E2E-тестов.
const pendingCalls = new Map<string, PendingCall>()

let callIdCounter = 1

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf-8')
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(payload)
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

    // POST /manager/cabapi_external/api/v1/phones/confirm/
    // Аналог ZvonokService.requestCallbackConfirmation — регистрирует
    // ожидание звонка с указанного номера, возвращает call_id и номер, на
    // который "звонить".
    if (req.method === 'POST' && url.pathname === '/manager/cabapi_external/api/v1/phones/confirm/') {
      const rawBody = await readBody(req)
      const params = new URLSearchParams(rawBody)
      const phone = params.get('phone') ?? ''

      const callId = String(callIdCounter++)
      pendingCalls.set(phone, { callId, readyAt: Date.now() + CONFIRM_DELAY_MS })

      sendJson(res, 200, {
        status: 'ok',
        data: {
          balance: '9999.00',
          call_id: Number(callId),
          created: new Date().toISOString(),
          phone,
          pincode: '',
          // Один фиктивный "разрешённый" номер — фронт покажет его
          // пользователю как номер для звонка (в реальном сценарии
          // E2E-тест не звонит физически, ему это и не нужно: мы просто
          // ждём CONFIRM_DELAY_MS и мок сам считает звонок поступившим).
          allowed_phones_for_call: ['+79990000000']
        }
      })
      return
    }

    // GET /manager/cabapi_external/api/v1/phones/calls_by_phone/?phone=...&campaign_id=...
    // Аналог ZvonokService.checkCallbackConfirmed — опрашивается фронтом в
    // цикле, пока не вернёт статус "pincode_ok" для нужного call_id.
    if (req.method === 'GET' && url.pathname === '/manager/cabapi_external/api/v1/phones/calls_by_phone/') {
      const phone = url.searchParams.get('phone') ?? ''
      const pending = pendingCalls.get(phone)

      if (!pending) {
        sendJson(res, 200, [])
        return
      }

      const isReady = Date.now() >= pending.readyAt

      sendJson(res, 200, [
        {
          call_id: Number(pending.callId),
          status: isReady ? 'pincode_ok' : 'in_progress',
          status_display: isReady ? 'Подтверждено (мок)' : 'Ожидание звонка (мок)',
          dial_status: isReady ? 5 : 0,
          dial_status_display: isReady ? 'Абонент ответил (мок)' : 'Ожидание (мок)',
          completed: isReady ? new Date().toISOString() : null
        }
      ])
      return
    }

    // POST /manager/cabapi_external/api/v1/phones/tellcode/ — старый
    // неиспользуемый метод (ZvonokService.sendVerificationCall), но на
    // всякий случай отвечаем и на него, чтобы мок был полной заменой.
    if (req.method === 'POST' && url.pathname === '/manager/cabapi_external/api/v1/phones/tellcode/') {
      sendJson(res, 200, {
        status: 'ok',
        data: {
          balance: '9999.00',
          call_id: callIdCounter++,
          created: new Date().toISOString(),
          phone: '',
          pincode: '0000'
        }
      })
      return
    }

    sendJson(res, 404, { status: 'error', message: 'Неизвестный маршрут мок-сервера zvonok' })
  } catch (error) {
    sendJson(res, 500, { status: 'error', message: (error as Error).message })
  }
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[mock-zvonok] слушает на http://localhost:${PORT} (замена https://zvonok.com для E2E)`)
})
