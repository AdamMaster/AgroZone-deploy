import { SellerReviewFilterFlag } from '@/generated/prisma/enums'

import { detectTextFlags } from './review-text-filter.util'

describe('detectTextFlags', () => {
  it('пустой и отсутствующий текст чистые', () => {
    expect(detectTextFlags(undefined)).toEqual([])
    expect(detectTextFlags(null)).toEqual([])
    expect(detectTextFlags('')).toEqual([])
  })

  it('обычный отзыв чистый', () => {
    expect(detectTextFlags('Хороший продавец, зерно привезли в срок, всё как договаривались.')).toEqual([])
  })

  it('цены и объёмы не принимаются за телефон', () => {
    expect(detectTextFlags('Купил 25 тонн пшеницы по 14 500 рублей, 2 года работаем')).toEqual([])
  })

  describe('мат', () => {
    it.each(['Это хуйня', 'полный пиздец', 'Он мудак', 'развели как лохов, сука', 'заебал', 'Блядь', 'ебанаты'])(
      'ловит «%s»',
      text => {
        expect(detectTextFlags(text)).toContain(SellerReviewFilterFlag.PROFANITY)
      }
    )

    it('ловит обход латинскими буквами и растяжкой', () => {
      expect(detectTextFlags('хyй')).toContain(SellerReviewFilterFlag.PROFANITY)
      expect(detectTextFlags('хуууууй')).toContain(SellerReviewFilterFlag.PROFANITY)
    })

    it.each([
      'Требуется доставка',
      'хлеб свежий',
      'не употреблять в пищу',
      'оскорблять не буду',
      'небольшой объём',
      'ребята молодцы',
      'лебедь',
      'хорошая цена, худой не попался',
      'ссуда оформлена',
      'сукно качественное',
      'похудел'
    ])('не принимает безобидное «%s»', text => {
      expect(detectTextFlags(text)).not.toContain(SellerReviewFilterFlag.PROFANITY)
    })
  })

  describe('ссылки', () => {
    it.each([
      'смотрите https://example.com/x',
      'www.shop-agro.ru',
      'пишите в t.me/agro_deals',
      'мой сайт agro-best.ru',
      'добавляйтесь @agro_seller',
      'vk.com/id12345'
    ])('ловит «%s»', text => {
      expect(detectTextFlags(text)).toContain(SellerReviewFilterFlag.LINK)
    })

    it('не принимает за ссылку обычное предложение с точкой', () => {
      expect(detectTextFlags('Всё отлично.Рекомендую. Продавец ответственный')).not.toContain(
        SellerReviewFilterFlag.LINK
      )
    })
  })

  describe('телефоны', () => {
    it.each(['звоните +7 (999) 123-45-67', '89991234567', '8 999 123 45 67', '+79991234567'])('ловит «%s»', text => {
      expect(detectTextFlags(text)).toContain(SellerReviewFilterFlag.PHONE)
    })

    it('несколько флагов сразу', () => {
      expect(detectTextFlags('сука, пишите +7 999 123 45 67 или t.me/x_agro')).toEqual([
        SellerReviewFilterFlag.PROFANITY,
        SellerReviewFilterFlag.LINK,
        SellerReviewFilterFlag.PHONE
      ])
    })
  })
})
