import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { toast } from 'sonner-native'

import { ActionSheet, type SheetAction } from '@/shared/components/action-sheet'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ImagePlus } from '@/shared/icons/lucide'

import type { UploadFile } from '@/lib/api/upload-file'

import { CameraPermissionError, pickAdPhotos, takeAdPhoto } from '../lib/pick-ad-photos'
import type { AdFormPhoto } from '../types/ad-form.types'
import { SortablePhotoGrid } from './sortable-photo-grid'

interface PhotoUploaderProps {
  photos: AdFormPhoto[]
  onChange: (photos: AdFormPhoto[]) => void
  maxFiles: number
  isPremium: boolean
  // Пока фото сжимаются, форму отправлять рано — новые снимки не успеют
  // попасть в запрос.
  isProcessing: boolean
  onProcessingChange: (isProcessing: boolean) => void
}

let localPhotoCounter = 0

// «Фотографии» — PhotoUploader сайта: сетка 3 в ряд, плитка «Добавить фото»,
// перестановка, удаление; выбранные снимки сжимаются на телефоне.
export function PhotoUploader({
  photos,
  onChange,
  maxFiles,
  isPremium,
  isProcessing,
  onProcessingChange
}: PhotoUploaderProps) {
  const router = useRouter()
  const iconColor = useThemeColor('--color-gray-900')
  const [isPicking, setIsPicking] = useState(false)
  const [isSourceSheetOpen, setIsSourceSheetOpen] = useState(false)
  // Пока снимки сжимаются, пользователь мог удалить или переставить фото —
  // новые добавляем к актуальному списку, а не к тому, что был до выбора.
  const latestPhotosRef = useRef(photos)
  useEffect(() => {
    latestPhotosRef.current = photos
  }, [photos])

  const isLimitReached = photos.length >= maxFiles

  // Добавляет снимки к актуальному списку; pick — галерея или камера.
  const addPhotos = async (pick: (remaining: number) => Promise<UploadFile[] | null>) => {
    setIsPicking(true)
    try {
      const remaining = maxFiles - latestPhotosRef.current.length
      onProcessingChange(true)
      const files = await pick(remaining)
      if (!files?.length) return

      const added = files.map((file): AdFormPhoto => ({ kind: 'local', id: `local-${(localPhotoCounter += 1)}`, file }))
      onChange([...latestPhotosRef.current, ...added].slice(0, maxFiles))
    } catch (error) {
      toast.error(
        error instanceof CameraPermissionError ? error.message : 'Не удалось добавить фото. Попробуйте выбрать другие'
      )
    } finally {
      onProcessingChange(false)
      setIsPicking(false)
    }
  }

  const sourceActions: SheetAction[] = [
    {
      key: 'camera',
      label: 'Сделать фото',
      onPress: () => void addPhotos(takeAdPhoto)
    },
    { key: 'gallery', label: 'Выбрать из галереи', onPress: () => void addPhotos(pickAdPhotos) }
  ]

  const busy = isPicking || isProcessing

  return (
    <View className='gap-2.5'>
      <Text className='text-sm leading-none font-medium text-gray-900'>
        Фотографии{' '}
        <Text className='text-xs font-normal text-gray-500'>
          (Объявления с фотографиями получают больше просмотров и откликов. Удерживайте фото и перетащите, чтобы
          изменить порядок.)
        </Text>
      </Text>

      <SortablePhotoGrid
        photos={photos}
        onReorder={onChange}
        onRemove={id => onChange(photos.filter(photo => photo.id !== id))}
        addTile={
          isLimitReached ? null : (
            <Pressable
              accessibilityRole='button'
              accessibilityLabel={busy ? 'Обрабатываем фото' : 'Добавить фото'}
              accessibilityState={{ busy }}
              disabled={busy}
              onPress={() => setIsSourceSheetOpen(true)}
              className='size-full items-center justify-center rounded-lg border-2 border-dashed border-border active:border-primary'
            >
              {busy ? (
                <ActivityIndicator colorClassName='accent-gray-900' />
              ) : (
                <ImagePlus size={24} color={iconColor} />
              )}
            </Pressable>
          )
        }
      />

      <ActionSheet visible={isSourceSheetOpen} actions={sourceActions} onClose={() => setIsSourceSheetOpen(false)} />

      {!isPremium && isLimitReached && (
        <View className='rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10'>
          <Text className='text-sm text-amber-800 dark:text-amber-200'>
            Вы достигли лимита в {maxFiles} фото. Приобретите{' '}
            <Text
              accessibilityRole='link'
              className='font-semibold underline'
              onPress={() => router.navigate('/profile/premium')}
            >
              Premium аккаунт
            </Text>
            , чтобы загружать больше фото.
          </Text>
        </View>
      )}
    </View>
  )
}
