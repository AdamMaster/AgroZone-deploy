import { ChatStats, evaluateContact } from './contact.util'

const HOUR = 60 * 60 * 1000
const NOW = new Date('2026-10-27T12:00:00.000Z')
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * HOUR)

const chat = (authorCount: number, sellerCount: number, sellerFirstHoursAgo: number, id = 'c1'): ChatStats => ({
  conversationId: id,
  author: authorCount ? { count: authorCount, firstAt: hoursAgo(sellerFirstHoursAgo + 1) } : null,
  seller: sellerCount ? { count: sellerCount, firstAt: hoursAgo(sellerFirstHoursAgo) } : null
})

describe('evaluateContact', () => {
  it('нет ни переписки, ни телефона — контакта нет', () => {
    expect(evaluateContact({ chats: [], firstPhoneRevealAt: null, now: NOW })).toEqual({ status: 'none' })
  })

  it('переписка, где обе стороны написали не меньше трёх сообщений, спустя 48 часов — можно', () => {
    expect(evaluateContact({ chats: [chat(3, 3, 49)], firstPhoneRevealAt: null, now: NOW })).toEqual({
      status: 'ok',
      conversationId: 'c1'
    })
  })

  it('двух сообщений от продавца мало, даже спустя недели', () => {
    expect(evaluateContact({ chats: [chat(5, 2, 500)], firstPhoneRevealAt: null, now: NOW })).toEqual({
      status: 'none'
    })
  })

  it('продавец не отвечал вовсе — контакта нет', () => {
    expect(evaluateContact({ chats: [chat(10, 0, 0)], firstPhoneRevealAt: null, now: NOW })).toEqual({ status: 'none' })
  })

  it('переписка достаточная, но 48 часов от первого ответа продавца ещё не прошли — сообщаем, когда можно', () => {
    const verdict = evaluateContact({ chats: [chat(4, 4, 10)], firstPhoneRevealAt: null, now: NOW })

    expect(verdict).toEqual({ status: 'fresh', availableAt: new Date(hoursAgo(10).getTime() + 48 * HOUR) })
  })

  it('ровно 48 часов — уже можно', () => {
    expect(evaluateContact({ chats: [chat(3, 3, 48)], firstPhoneRevealAt: null, now: NOW }).status).toBe('ok')
  })

  it('показанный телефон спустя 48 часов даёт право, но диалога нет', () => {
    expect(evaluateContact({ chats: [], firstPhoneRevealAt: hoursAgo(50), now: NOW })).toEqual({
      status: 'ok',
      conversationId: null
    })
  })

  it('телефон показан недавно — рано', () => {
    expect(evaluateContact({ chats: [], firstPhoneRevealAt: hoursAgo(1), now: NOW })).toEqual({
      status: 'fresh',
      availableAt: new Date(hoursAgo(1).getTime() + 48 * HOUR)
    })
  })

  it('из нескольких оснований берётся то, что созрело раньше всех', () => {
    const verdict = evaluateContact({
      chats: [chat(3, 3, 100, 'old'), chat(3, 3, 60, 'newer')],
      firstPhoneRevealAt: hoursAgo(55),
      now: NOW
    })

    expect(verdict).toEqual({ status: 'ok', conversationId: 'old' })
  })

  it('свежая переписка не мешает давнему телефону', () => {
    expect(evaluateContact({ chats: [chat(3, 3, 5)], firstPhoneRevealAt: hoursAgo(72), now: NOW })).toEqual({
      status: 'ok',
      conversationId: null
    })
  })
})
