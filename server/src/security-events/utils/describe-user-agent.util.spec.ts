import { describeUserAgent } from './describe-user-agent.util'

const UA = {
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  yandexWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 YaBrowser/24.4.0.0 Safari/537.36',
  operaWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OPR/110.0.0.0',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  chromeIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  samsungAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
}

describe('describeUserAgent', () => {
  it.each([
    ['Chrome на Windows', UA.chromeWindows, 'Chrome · Windows'],
    ['Edge (не путает с Chrome)', UA.edgeWindows, 'Edge · Windows'],
    ['Яндекс Браузер (не путает с Chrome)', UA.yandexWindows, 'Yandex Browser · Windows'],
    ['Opera (не путает с Chrome)', UA.operaWindows, 'Opera · Windows'],
    ['Firefox на Linux', UA.firefoxLinux, 'Firefox · Linux'],
    ['Safari на macOS', UA.safariMac, 'Safari · macOS'],
    ['Safari на iPhone (iOS, а не macOS)', UA.safariIphone, 'Safari · iOS'],
    ['Chrome на iPhone', UA.chromeIphone, 'Chrome · iOS'],
    ['Chrome на Android (Android, а не Linux)', UA.chromeAndroid, 'Chrome · Android'],
    ['Samsung Internet (не путает с Chrome)', UA.samsungAndroid, 'Samsung Internet · Android']
  ])('%s', (_name, userAgent, expected) => {
    expect(describeUserAgent(userAgent)).toBe(expected)
  })

  it('помечает ботов', () => {
    expect(describeUserAgent(UA.googlebot)).toBe('Bot')
  })

  it.each([null, undefined, ''])('для пустого значения %p возвращает null', value => {
    expect(describeUserAgent(value)).toBeNull()
  })

  it('для нераспознаваемой строки возвращает null, а не выдуманную подпись', () => {
    expect(describeUserAgent('curl-like-client/1.0')).toBeNull()
  })

  it('если распознан только браузер или только ОС, возвращает то, что известно', () => {
    expect(describeUserAgent('Firefox/125.0')).toBe('Firefox')
    expect(describeUserAgent('(Windows NT 10.0)')).toBe('Windows')
  })
})
