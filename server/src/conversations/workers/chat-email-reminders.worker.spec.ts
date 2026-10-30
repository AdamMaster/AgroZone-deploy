import type { ChatEmailRemindersService } from '../chat-email-reminders.service'
import { ChatEmailRemindersWorker } from './chat-email-reminders.worker'

describe('ChatEmailRemindersWorker', () => {
  let service: { processDue: jest.Mock }
  let worker: ChatEmailRemindersWorker

  beforeEach(() => {
    service = { processDue: jest.fn().mockResolvedValue(0) }
    worker = new ChatEmailRemindersWorker(service as unknown as ChatEmailRemindersService)
  })

  it('запуск разбирает созревшие письма', async () => {
    await worker.sendDueEmails()

    expect(service.processDue).toHaveBeenCalledTimes(1)
  })

  it('запуск, наложившийся на незавершённый, пропускается', async () => {
    let finish!: () => void
    service.processDue.mockReturnValue(new Promise<number>(resolve => (finish = () => resolve(0))))

    const first = worker.sendDueEmails()
    await worker.sendDueEmails()

    expect(service.processDue).toHaveBeenCalledTimes(1)

    finish()
    await first
  })

  it('после сбоя следующий запуск работает как обычно', async () => {
    service.processDue.mockRejectedValueOnce(new Error('db down'))

    await expect(worker.sendDueEmails()).resolves.toBeUndefined()
    await worker.sendDueEmails()

    expect(service.processDue).toHaveBeenCalledTimes(2)
  })
})
