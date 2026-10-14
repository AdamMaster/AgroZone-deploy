import { useCallback, useState } from 'react'
import {
  FlatList,
  type ListRenderItem,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  View,
  useWindowDimensions
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { X } from '@/shared/icons/lucide'

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
// всю ширину, листание свайпом, увеличение щипком, только крестик.
export function PhotoLightbox({ visible, images, index, title, onIndexChange, onClose }: PhotoLightboxProps) {
  const { width, height } = useWindowDimensions()
  const { top } = useSafeAreaInsets()
  const [isZoomed, setIsZoomed] = useState(false)

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
          accessibilityLabel={`${title} — фото ${itemIndex + 1}`}
        />
      </View>
    ),
    [width, height, title]
  )

  return (
    <Modal
      visible={visible}
      animationType='fade'
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      onShow={() => setIsZoomed(false)}
    >
      {/* Жесты внутри Modal на Android работают только со своим корнем. */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
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
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Закрыть'
          onPress={onClose}
          hitSlop={12}
          className='absolute right-3 size-11 items-center justify-center'
          style={{ top: top + 8 }}
        >
          <X size={26} color='#ffffff' />
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  )
}
