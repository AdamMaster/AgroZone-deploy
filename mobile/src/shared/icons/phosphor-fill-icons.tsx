import Svg, { Path } from 'react-native-svg'

// Иконки нижней панели — те же Phosphor (вариант fill), что у сайта
// (client/src/components/icons/phosphor-fill-icons.tsx): пути скопированы
// один в один, чтобы панель выглядела так же.

interface IconProps {
  size: number
  color: string
}

export function HouseFillIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 256 256' fill={color}>
      <Path d='M224,120v96a8,8,0,0,1-8,8H160a8,8,0,0,1-8-8V164a4,4,0,0,0-4-4H108a4,4,0,0,0-4,4v52a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V120a16,16,0,0,1,4.69-11.31l80-80a16,16,0,0,1,22.62,0l80,80A16,16,0,0,1,224,120Z' />
    </Svg>
  )
}

export function HeartFillIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 256 256' fill={color}>
      <Path d='M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z' />
    </Svg>
  )
}

export function StackFillIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 256 256' fill={color}>
      <Path d='M220,169.09l-92,53.65L36,169.09A8,8,0,0,0,28,182.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,169.09Z' />
      <Path d='M220,121.09l-92,53.65L36,121.09A8,8,0,0,0,28,134.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,121.09Z' />
      <Path d='M28,86.91l96,56a8,8,0,0,0,8.06,0l96-56a8,8,0,0,0,0-13.82l-96-56a8,8,0,0,0-8.06,0l-96,56a8,8,0,0,0,0,13.82Z' />
    </Svg>
  )
}

export function ChatCircleFillIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 256 256' fill={color}>
      <Path d='M232,128A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Z' />
    </Svg>
  )
}

export function UserFillIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox='0 0 256 256' fill={color}>
      <Path d='M230.93,220a8,8,0,0,1-6.93,4H32a8,8,0,0,1-6.92-12c15.23-26.33,38.7-45.21,66.09-54.16a72,72,0,1,1,73.66,0c27.39,8.95,50.86,27.83,66.09,54.16A8,8,0,0,1,230.93,220Z' />
    </Svg>
  )
}
