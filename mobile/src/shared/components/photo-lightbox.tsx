import { useCallback, useState } from 'react'
import {
  FlatList,
  type ListRenderItem,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ArrowLeft } from '@/shared/icons/lucide'

import { ZoomableImage } from './zoomable-image'

interface PhotoLightboxProps {
  visible: boolean
  images: readonly string[]
  index: number
  title: string
  onIndexChange: (index: number) => void
  onClose: () => void
}

// Фото на весь экран — как лайтбокс сайта на телефоне: чёрный фон, фото во
// всю ширину, листание свайпом, увеличение щипком, закрытие стрелкой «Назад» или
// свайпом фото вверх/вниз.
export function PhotoLightbox({ visible, images, index, title, onIndexChange, onClose }: PhotoLightboxProps) {
  const { width, height } = useWindowDimensions()
  const { top } = useSafeAreaInsets()
  const [isZoomed, setIsZoomed] = useState(false)
  // Насколько фото смахнули по вертикали: чем дальше, тем прозрачнее фон.
  const dragY = useSharedValue(0)

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(dragY.get()), [0, height / 2], [1, 0], 'clamp')
  }))

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onIndexChange(Math.round(event.nativeEvent.contentOffset.x / width))
  }

  const renderItem: ListRenderItem<string> = useCallback(
    ({ item, index: itemIndex }) => (
      <View style={{ width, height }} className='items-center justify-center'>
        <ZoomableImage
          uri={item}
          width={width}
          height={height}
          onZoomChange={setIsZoomed}
          dragY={dragY}
          onDismiss={onClose}
          accessibilityLabel={`${title} — фото ${itemIndex + 1}`}
        />
      </View>
    ),
    [width, height, title, dragY, onClose]
  )

  return (
    <Modal
      visible={visible}
      animationType='fade'
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      onShow={() => {
        setIsZoomed(false)
        dragY.set(0)
      }}
    >
      {/* Жесты внутри Modal на Android работают только со своим корнем. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          pointerEvents='none'
          style={[StyleSheet.absoluteFill, { backgroundColor: '#171717' }, fadeStyle]}
        />
        <FlatList
          data={images}
          renderItem={renderItem}
          keyExtractor={(item, itemIndex) => `${itemIndex}-${item}`}
          horizontal
          pagingEnabled
          scrollEnabled={!isZoomed}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          getItemLayout={(_data, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
          onMomentumScrollEnd={handleMomentumEnd}
        />
        {/* Шапка как у страницы объявления: «Назад» слева, номер фото справа. */}
        <Animated.View
          className='absolute inset-x-0 top-0 flex-row items-center justify-between'
          style={[{ paddingTop: top }, fadeStyle]}
        >
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Назад'
            onPress={onClose}
            className='size-13 items-center justify-center'
          >
            <ArrowLeft size={20} color='#fff' />
          </Pressable>
          {images.length > 1 && (
            <Text className='px-4 text-base text-white'>
              {index + 1} из {images.length}
            </Text>
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  )
}
