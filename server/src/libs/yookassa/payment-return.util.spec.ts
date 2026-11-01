import { BadRequestException } from '@nestjs/common'

import { assertAppReturnUri, buildReturnUrl } from './payment-return.util'

describe('payment-return.util', () => {
  describe('assertAppReturnUri', () => {
    it.each(['agrozone://payment-return', 'exp://192.168.1.5:8081/--/payment-return'])('пропускает %s', uri => {
      expect(() => assertAppReturnUri(uri)).not.toThrow()
    })

    it('без адреса (запрос с сайта) ничего не проверяет', () => {
      expect(() => assertAppReturnUri(undefined)).not.toThrow()
    })

    it.each(['https://evil.example/steal', 'javascript:alert(1)', 'не адрес', ''])('отклоняет %p', uri => {
      expect(() => assertAppReturnUri(uri)).toThrow(BadRequestException)
    })
  })

  describe('buildReturnUrl', () => {
    const base = {
      webReturnUrl: 'https://agro-zone.ru/profile/settings/premium?purchase=p1',
      backendOrigin: 'https://api.agro-zone.ru'
    }

    it('с сайта возвращает прежний адрес страницы сайта', () => {
      expect(buildReturnUrl({ ...base, appReturnUri: undefined, purchaseId: 'p1' })).toBe(base.webReturnUrl)
    })

    it('из приложения ведёт на сервер и передаёт адрес приложения и номер платежа', () => {
      const url = new URL(buildReturnUrl({ ...base, appReturnUri: 'agrozone://payment-return', purchaseId: 'p1' }))

      expect(url.origin).toBe('https://api.agro-zone.ru')
      expect(url.pathname).toBe('/payments/yookassa/return')
      expect(url.searchParams.get('to')).toBe('agrozone://payment-return')
      expect(url.searchParams.get('purchase')).toBe('p1')
    })
  })
})
