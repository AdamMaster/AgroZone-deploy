import { Text, View } from 'react-native'

import { useCategoryFeatures } from '@/features/categories/hooks/use-category-features'
import { formatFeatureValue } from '@/features/categories/lib/format-feature-value'

import { Heading } from '@/shared/components/heading'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { MapPin } from '@/shared/icons/lucide'

interface AdInfoSectionsProps {
  address: string
  description: string
  categoryId: string
  features: Record<string, unknown>
}

// Абзацы описания — как MultilineText сайта: пустая строка разделяет
// абзацы, одиночный перенос остаётся переносом.
const toParagraphs = (text: string) =>
  text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)

// Адрес, описание и характеристики — нижняя часть страницы объявления.
export function AdInfoSections({ address, description, categoryId, features }: AdInfoSectionsProps) {
  const iconColor = useThemeColor('--color-gray-950')
  const categoryFeatures = useCategoryFeatures(categoryId)
  const filledFeatures = categoryFeatures.flatMap(feature => {
    const value = formatFeatureValue(feature, features)
    return value === null ? [] : [{ feature, value }]
  })
  const paragraphs = toParagraphs(description)

  return (
    <View className='gap-8'>
      <View>
        <Heading level={4} className='mb-2'>
          Адрес
        </Heading>
        <View className='flex-row gap-2'>
          <View className='pt-0.5'>
            <MapPin size={20} color={iconColor} />
          </View>
          <Text selectable className='flex-1 text-base text-gray-950'>
            {address}
          </Text>
        </View>
      </View>

      {paragraphs.length > 0 && (
        <View>
          <Heading level={4} className='mb-2'>
            Описание
          </Heading>
          <View className='gap-3'>
            {paragraphs.map((paragraph, index) => (
              <Text key={index} selectable className='text-base leading-6 text-gray-950'>
                {paragraph}
              </Text>
            ))}
          </View>
        </View>
      )}

      {filledFeatures.length > 0 && (
        <View>
          <Heading level={4} className='mb-3'>
            Характеристики
          </Heading>
          <View className='gap-2'>
            {filledFeatures.map(({ feature, value }) => (
              <Text key={feature.id} className='text-base text-gray-950'>
                <Text className='text-gray-600'>{feature.label}</Text>: <Text className='font-medium'>{value}</Text>
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}
