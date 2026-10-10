import type { ImageSourcePropType } from 'react-native'

// Картинки плиток категорий верхнего уровня — те же, что у сайта
// (CategoryItem, client/public/images/categories), уменьшенные для
// приложения. Ключ — slug категории. Для agrokultury у сайта картинки нет
// (файл в public отсутствует) — у плитки просто нет иллюстрации.
export const CATEGORY_ICONS: Readonly<Record<string, ImageSourcePropType>> = {
  agrohimiya: require('@/assets/images/categories/agrohimiya.png'),
  'sh-zhivotnye-i-ptica': require('@/assets/images/categories/selskohozyajstvennye-zhivotnye-ptica-i-akvakultura.png'),
  'korma-i-komponenty': require('@/assets/images/categories/korma-i-kormovye-komponenty.png'),
  oborudovanie: require('@/assets/images/categories/oborudovanie.png'),
  'produkty-pererabotki': require('@/assets/images/categories/produkty-pererabotki.png'),
  'svezhaya-selhozprodukciya': require('@/assets/images/categories/svezhaya-selhozprodukciya.png'),
  'sh-tehnika': require('@/assets/images/categories/sh-tehnika.png'),
  'tara-i-upakovka': require('@/assets/images/categories/tara-i-upakovka.png'),
  veterinariya: require('@/assets/images/categories/veterinariya.png'),
  'polevye-kultury': require('@/assets/images/categories/polevye-kultury.png'),
  'zhivotnoe-syryo': require('@/assets/images/categories/zhivotnoe-syryo.png'),
  'posadochnyj-material': require('@/assets/images/categories/posadochnyj-material.png'),
  'zemli-i-obuekty-sh-nedvizhimosti': require('@/assets/images/categories/zemli-i-obuekty-sh-nedvizhimosti.png'),
  uslugi: require('@/assets/images/categories/uslugi.png'),
  prochee: require('@/assets/images/categories/prochee.png')
}
