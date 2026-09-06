const sharp = require('sharp')
const fs = require('fs')

const logoPath = fs.readFileSync('public/images/logo-white.svg', 'utf8')
// Достаём внутренние <path> элементы логотипа (без обёртки svg/defs), чтобы
// встроить их в наш собственный SVG-холст нужного размера с собственным
// viewBox/transform.
const paths = logoPath.match(/<path[^>]*\/>/g)?.join('\n') ?? ''

const WIDTH = 1200
const HEIGHT = 630
// Оригинальный viewBox логотипа — 495.23145 x 100.67822.
const LOGO_W = 495.23145
const LOGO_H = 100.67822
const SCALE = 620 / LOGO_W
const SCALED_W = LOGO_W * SCALE
const SCALED_H = LOGO_H * SCALE
const OFFSET_X = (WIDTH - SCALED_W) / 2
const OFFSET_Y = (HEIGHT - SCALED_H) / 2 - 20

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1b365d"/>
      <stop offset="100%" stop-color="#12243f"/>
    </linearGradient>
    <style>
      .cls-1 { fill: #ffffff; }
      .cls-2 { fill: #40a500; }
    </style>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${WIDTH}" height="14" fill="#40a500"/>
  <g transform="translate(${OFFSET_X}, ${OFFSET_Y}) scale(${SCALE})">
    ${paths}
  </g>
  <text x="${WIDTH / 2}" y="${OFFSET_Y + SCALED_H + 70}" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="34" fill="#e2e8f0">
    Агропромышленная торговая площадка
  </text>
</svg>
`

fs.writeFileSync('/tmp/og-default.svg', svg)

sharp(Buffer.from(svg))
  .jpeg({ quality: 90 })
  .toFile('public/images/og-default.jpg')
  .then(() => console.log('OK'))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
