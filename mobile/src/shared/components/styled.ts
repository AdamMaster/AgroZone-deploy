import { Image } from 'expo-image'
import { withUniwind } from 'uniwind'

// Сторонние компоненты, которым нужен className. Обёртки создаются один раз
// на уровне модуля (требование Uniwind): создание внутри компонента
// пересоздавало бы обёртку на каждом рендере.
export const StyledImage = withUniwind(Image)
