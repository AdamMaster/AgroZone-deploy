import { type ReactNode, useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

import { AdPhoto } from '@/shared/components/ad-photo'
import { StyledImage } from '@/shared/components/styled'
import { GripVertical, X } from '@/shared/icons/lucide'

import type { AdFormPhoto } from '../types/ad-form.types'

const COLUMNS = 3
const GAP = 4
// Перетаскивание начинается после удержания — иначе жест мешал бы
// прокручивать форму.
const LONG_PRESS_MS = 250

// Порядковый номер каждого фото в сетке по его id.
type Positions = Record<string, number>

const positionsOf = (photos: readonly AdFormPhoto[]): Positions =>
  Object.fromEntries(photos.map((photo, index) => [photo.id, index]))

interface SortablePhotoGridProps {
  photos: readonly AdFormPhoto[]
  onReorder: (photos: AdFormPhoto[]) => void
  onRemove: (id: string) => void
  // Плитка «Добавить фото» — последней в сетке; null — лимит достигнут.
  addTile: ReactNode | null
}

// Сетка фото 3 в ряд с перестановкой перетаскиванием — как PhotoUploader
// сайта (dnd-kit): удержали фото, повели — соседи расступаются, отпустили —
// порядок сохранён. Первое фото — обложка объявления.
export function SortablePhotoGrid({ photos, onReorder, onRemove, addTile }: SortablePhotoGridProps) {
  const [width, setWidth] = useState(0)
  const positions = useSharedValue<Positions>(positionsOf(photos))
  const tileSize = width > 0 ? (width - GAP * (COLUMNS - 1)) / COLUMNS : 0
  const tileCount = photos.length + (addTile ? 1 : 0)
  const rows = Math.ceil(tileCount / COLUMNS)
  const height = rows > 0 ? rows * tileSize + (rows - 1) * GAP : 0

  // Фото добавили или удалили — раскладка заново по порядку массива.
  useEffect(() => {
    positions.value = positionsOf(photos)
  }, [photos, positions])

  const commitOrder = (next: Positions) => {
    const reordered = [...photos].sort((a, b) => (next[a.id] ?? 0) - (next[b.id] ?? 0))
    if (reordered.some((photo, index) => photo !== photos[index])) onReorder(reordered)
  }

  const addSlot = slotOffset(photos.length, tileSize)

  return (
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ height }}>
      {tileSize > 0 &&
        photos.map(photo => (
          <SortablePhotoTile
            key={photo.id}
            photo={photo}
            size={tileSize}
            count={photos.length}
            positions={positions}
            onDrop={commitOrder}
            onRemove={onRemove}
          />
        ))}
      {tileSize > 0 && addTile && (
        <View
          className='absolute'
          style={{
            width: tileSize,
            height: tileSize,
            transform: [{ translateX: addSlot.x }, { translateY: addSlot.y }]
          }}
        >
          {addTile}
        </View>
      )}
    </View>
  )
}

function slotOffset(index: number, size: number) {
  'worklet'
  return { x: (index % COLUMNS) * (size + GAP), y: Math.floor(index / COLUMNS) * (size + GAP) }
}

// Фото переехало с from на to: соседи между ними сдвигаются на одно место.
function movePosition(positions: Positions, id: string, from: number, to: number): Positions {
  'worklet'
  const next: Positions = {}

  for (const key of Object.keys(positions)) {
    const index = positions[key]

    if (key === id) next[key] = to
    else if (from < to && index > from && index <= to) next[key] = index - 1
    else if (from > to && index >= to && index < from) next[key] = index + 1
    else next[key] = index
  }

  return next
}

interface SortablePhotoTileProps {
  photo: AdFormPhoto
  size: number
  count: number
  positions: SharedValue<Positions>
  onDrop: (positions: Positions) => void
  onRemove: (id: string) => void
}

function SortablePhotoTile({ photo, size, count, positions, onDrop, onRemove }: SortablePhotoTileProps) {
  const { id } = photo
  const isDragging = useSharedValue(false)
  const dragX = useSharedValue(0)
  const dragY = useSharedValue(0)
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)
  const maxRow = Math.floor((count - 1) / COLUMNS)

  const gesture = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      const slot = slotOffset(positions.value[id] ?? 0, size)
      startX.value = slot.x
      startY.value = slot.y
      dragX.value = slot.x
      dragY.value = slot.y
      isDragging.value = true
    })
    .onUpdate(event => {
      dragX.value = startX.value + event.translationX
      dragY.value = startY.value + event.translationY

      const column = Math.min(Math.max(Math.round(dragX.value / (size + GAP)), 0), COLUMNS - 1)
      const row = Math.min(Math.max(Math.round(dragY.value / (size + GAP)), 0), maxRow)
      const target = Math.min(row * COLUMNS + column, count - 1)
      const current = positions.value[id] ?? 0

      if (target !== current) positions.set(movePosition(positions.get(), id, current, target))
    })
    .onFinalize(() => {
      if (!isDragging.value) return

      isDragging.value = false
      scheduleOnRN(onDrop, positions.value)
    })

  const animatedStyle = useAnimatedStyle(() => {
    const slot = slotOffset(positions.value[id] ?? 0, size)

    return {
      zIndex: isDragging.value ? 10 : 0,
      opacity: isDragging.value ? 0.7 : 1,
      transform: [
        { translateX: isDragging.value ? dragX.value : withTiming(slot.x) },
        { translateY: isDragging.value ? dragY.value : withTiming(slot.y) }
      ]
    }
  })

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[{ position: 'absolute', width: size, height: size }, animatedStyle]}
        accessibilityLabel='Фото объявления'
      >
        <View className='size-full overflow-hidden rounded-lg border border-border'>
          {photo.kind === 'remote' ? (
            <AdPhoto url={photo.url} size={400} className='size-full' contentFit='cover' />
          ) : (
            <StyledImage source={{ uri: photo.file.uri }} className='size-full' contentFit='cover' />
          )}
          <View pointerEvents='none' className='absolute top-1 left-1 rounded-full bg-black/50 p-1'>
            <GripVertical size={14} color='#ffffff' />
          </View>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Удалить фото'
            hitSlop={6}
            onPress={() => onRemove(id)}
            className='absolute top-1 right-1 rounded-full bg-black/50 p-1.5 active:bg-black/70'
          >
            <X size={14} color='#ffffff' />
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  )
}
