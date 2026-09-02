import { SVGProps } from 'react'

// Геометрия — Phosphor Icons, начертание Fill (MIT-лицензия,
// https://github.com/phosphor-icons/core, /assets/fill). Скопированы как
// обычные SVG-компоненты без установки пакета @phosphor-icons/react — под
// нижнюю таб-панель нужно всего несколько иконок, тащить всю библиотеку
// (7700+ иконок, 6 начертаний) ради этого избыточно (см. обсуждение с
// пользователем — Ant Design Icons отклонили по той же причине, лишний вес
// в бандл ради пары иконок). Пропсы — обычные SVGProps, className
// работает так же, как у иконок lucide (size-*, text-* и т.д.), currentColor
// берётся из CSS color, так что заливка красится через text-*.
//
// Если позже понадобится больше иконок Phosphor (например для категорий,
// см. обсуждение) — тогда уже есть смысл поставить сам пакет, а не
// копировать иконки по одной вручную.
type IconProps = SVGProps<SVGSVGElement>

export const HouseFillIcon = (props: IconProps) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' fill='currentColor' {...props}>
    <path d='M224,120v96a8,8,0,0,1-8,8H160a8,8,0,0,1-8-8V164a4,4,0,0,0-4-4H108a4,4,0,0,0-4,4v52a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V120a16,16,0,0,1,4.69-11.31l80-80a16,16,0,0,1,22.62,0l80,80A16,16,0,0,1,224,120Z' />
  </svg>
)

export const HeartFillIcon = (props: IconProps) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' fill='currentColor' {...props}>
    <path d='M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z' />
  </svg>
)

export const StackFillIcon = (props: IconProps) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' fill='currentColor' {...props}>
    <path d='M220,169.09l-92,53.65L36,169.09A8,8,0,0,0,28,182.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,169.09Z' />
    <path d='M220,121.09l-92,53.65L36,121.09A8,8,0,0,0,28,134.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,121.09Z' />
    <path d='M28,86.91l96,56a8,8,0,0,0,8.06,0l96-56a8,8,0,0,0,0-13.82l-96-56a8,8,0,0,0-8.06,0l-96,56a8,8,0,0,0,0,13.82Z' />
  </svg>
)

export const ChatCircleFillIcon = (props: IconProps) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' fill='currentColor' {...props}>
    <path d='M232,128A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Z' />
  </svg>
)

export const UserFillIcon = (props: IconProps) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' fill='currentColor' {...props}>
    <path d='M230.93,220a8,8,0,0,1-6.93,4H32a8,8,0,0,1-6.92-12c15.23-26.33,38.7-45.21,66.09-54.16a72,72,0,1,1,73.66,0c27.39,8.95,50.86,27.83,66.09,54.16A8,8,0,0,1,230.93,220Z' />
  </svg>
)

// Оригинальная заливка pencil-fill у Phosphor визуально широкая — гранёный
// хвостик у острия читается как толстый карандаш даже на мелком размере
// (жалоба пользователя). Вместо неё — простой силуэт от руки: тонкое
// тело + треугольное остриё, повёрнутое на 45° так, чтобы остриё смотрело
// в левый нижний угол (как у большинства "edit"-иконок).
export const PencilFillIcon = (props: IconProps) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' fill='currentColor' {...props}>
    <path transform='rotate(-45 128 128)' d='M42,128 L70,118 L210,118 L210,138 L70,138 Z' />
  </svg>
)
