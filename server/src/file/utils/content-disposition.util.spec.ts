import { contentDisposition } from './content-disposition.util'

describe('contentDisposition', () => {
  it('русское имя — через filename*, рядом ASCII-вариант для старых клиентов', () => {
    expect(contentDisposition('attachment', 'Прайс.docx', 'docx')).toBe(
      `attachment; filename="_____.docx"; filename*=UTF-8''${encodeURIComponent('Прайс.docx')}`
    )
  })

  it('расширение — определённое по содержимому, а не из имени файла', () => {
    expect(contentDisposition('inline', 'price.html', 'pdf')).toContain('filename="price.pdf"')
  })

  it('кавычки, переводы строк и слэши из имени убираются — заголовок не сломать', () => {
    const header = contentDisposition('attachment', 'a"\r\nX-Evil: 1/..\\b.pdf', 'pdf')

    expect(header).not.toMatch(/[\r\n]/)
    expect(header).toContain('filename="aX-Evil 1..b.pdf"')
  })

  it('пустое имя — «file»', () => {
    expect(contentDisposition('attachment', '.pdf', 'pdf')).toContain('filename="file.pdf"')
  })
})
