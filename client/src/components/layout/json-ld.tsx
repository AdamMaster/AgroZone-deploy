// Рендерит один или несколько объектов schema.org как
// <script type="application/ld+json">. Без 'use client' — это чистая
// структурированная разметка для поисковиков, никакой интерактивности не
// нужно, работает и в серверных компонентах (а нужен он именно там —
// страницы категорий/объявлений уже серверные, см. S1 в ROADMAP.md).
//
// JSON.stringify сам экранирует большинство спецсимволов, но не "<" —
// значение вроде названия объявления, в которое кто-то вписал буквально
// "</script><script>...", могло бы преждевременно закрыть наш тег и
// внедрить произвольный HTML/JS на страницу. Заменяем "<" на его юникод-
// escape ("<") — валиден внутри JSON-строки и не меняет то, что видит
// парсер JSON-LD, но больше не читается браузером как разметка.
interface JsonLdProps {
  data: object | object[]
}

export const JsonLd = ({ data }: JsonLdProps) => {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')

  return <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: json }} />
}
