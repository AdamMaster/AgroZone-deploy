import { useRef, useState } from 'react'
import {
  FlatList,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View
} from 'react-native'

import { AdBadgeChip } from '@/features/ads/components/ad-badge-chip'
import type { AdBadge } from '@/features/ads/types/ad.types'

import { AdPhoto } from '@/shared/components/ad-photo'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ImageIcon } from '@/shared/icons/lucide'

import { PhotoLightbox } from './photo-lightbox'

interface AdGalleryProps {
  images: readonly string[]
  title: string
  // Значок «Срочно» и т.п., пока услуга действует.
  badge: AdBadge | null
}

// Высота фото к ширине — как pt-[76%] у галереи сайта на телефоне.
const PHOTO_ASPECT = 0.76

// Галерея объявления — как на сайте: фото листаются свайпом, под ними —
// миниатюры с рамкой у текущего, нажатие открывает фото на весь экран.
export function AdGallery({ images, title, badge }: AdGalleryProps) {
  const listRef = useRef<FlatList<string>>(null)
  const [width, setWidth] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const placeholderIconColor = useThemeColor('--color-gray-400')
  const height = width * PHOTO_ASPECT

  const showPhoto = (index: number, animated: boolean) => {
    setActiveIndex(index)
    listRef.current?.scrollToIndex({ index, animated })
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return

    const index = Math.round(event.nativeEvent.contentOffset.x / width)
    setActiveIndex(current => (current === index ? current : index))
  }

  const renderPhoto: ListRenderItem<string> = ({ item, index }) => (
    <Pressable
      accessibilityRole='imagebutton'
      accessibilityLabel={`${title} — фото ${index + 1}`}
      onPress={() => setIsLightboxOpen(true)}
      style={{ width, height }}
    >
      <AdPhoto
        url={item}
        size={1280}
        className='size-full'
        contentFit='cover'
        priority={index === 0 ? 'high' : 'normal'}
      />
    </Pressable>
  )

  if (!images.length) {
    return (
      <View
        className='mb-2 items-center justify-center overflow-hidden rounded-xl bg-gray-100'
        style={{ aspectRatio: 1 / PHOTO_ASPECT }}
      >
        <ImageIcon size={64} color={placeholderIconColor} />
      </View>
    )
  }

  return (
    <View>
      <View
        className='mb-0.5 overflow-hidden rounded-xl bg-gray-100'
        style={{ aspectRatio: 1 / PHOTO_ASPECT }}
        onLayout={event => setWidth(event.nativeEvent.layout.width)}
      >
        {width > 0 && (
          <FlatList
            ref={listRef}
            data={images}
            renderItem={renderPhoto}
            keyExtractor={(item, index) => `${index}-${item}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={32}
            getItemLayout={(_data, index) => ({ length: width, offset: width * index, index })}
          />
        )}
        {badge && (
          <View className='absolute top-2 left-2'>
            <AdBadgeChip badge={badge} />
          </View>
        )}
      </View>

      {images.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName='gap-0.5'>
          {images.map((image, index) => (
            <Pressable
              key={`${index}-${image}`}
              accessibilityRole='button'
              accessibilityLabel={`Фото ${index + 1}`}
              accessibilityState={{ selected: index === activeIndex }}
              onPress={() => showPhoto(index, false)}
              className={`size-16 overflow-hidden rounded-md border bg-gray-100 ${
                index === activeIndex ? 'border-primary' : 'border-transparent'
              }`}
            >
              <AdPhoto url={image} size={400} className='size-full' contentFit='cover' />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <PhotoLightbox
        visible={isLightboxOpen}
        images={images}
        index={activeIndex}
        title={title}
        onIndexChange={setActiveIndex}
        // Закрыли на другом фото — галерея на странице показывает его же.
        onClose={() => {
          setIsLightboxOpen(false)
          showPhoto(activeIndex, false)
        }}
      />
    </View>
  )
}
