import { BadRequestException } from '@nestjs/common'

import { YookassaWebhookController } from './yookassa-webhook.controller'

describe('YookassaWebhookController.returnToApp', () => {
  const PURCHASE_ID = '3f2b8a52-0f6e-4d5d-9d57-7f1f5b0f2d11'
  const controller = new YookassaWebhookController(null as never, null as never, null as never, null as never)

  it('перенаправляет в приложение и передаёт номер платежа', () => {
    expect(controller.returnToApp({ to: 'agrozone://payment-return', purchase: PURCHASE_ID })).toEqual({
      url: `agrozone://payment-return?purchase=${PURCHASE_ID}`
    })
  })

  it('если в адресе приложения уже есть параметры, дописывает через &', () => {
    expect(
      controller.returnToApp({ to: 'exp://192.168.1.5:8081/--/payment-return?x=1', purchase: PURCHASE_ID })
    ).toEqual({
      url: `exp://192.168.1.5:8081/--/payment-return?x=1&purchase=${PURCHASE_ID}`
    })
  })

  it.each(['https://evil.example/phish', 'javascript:alert(1)', 'not a url'])(
    'не перенаправляет на посторонний адрес %p (защита от открытого редиректа)',
    to => {
      expect(() => controller.returnToApp({ to, purchase: PURCHASE_ID })).toThrow(BadRequestException)
    }
  )
})
