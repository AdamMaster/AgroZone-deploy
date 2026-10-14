import { useState } from 'react'
import { toast } from 'sonner-native'

import type { SheetAction } from '@/shared/components/action-sheet'

import type { UploadFile } from '@/lib/api/upload-file'
import { CameraPermissionError, pickPhotos, takePhoto } from '@/lib/media/pick-photos'

interface UsePhotoPickerOptions {
  // Сколько фото можно добавить прямо сейчас — читается в момент выбора, а не
  // при отрисовке: пока открыта галерея, список мог измениться.
  getRemaining: () => number
  onPicked: (files: UploadFile[]) => void
}

// Выбор фото из галереи или с камеры для загрузчика объявления и сообщения
// чата: меню «Сделать фото / Выбрать из галереи» (ActionSheet), сжатие
// снимков и сообщение, если не вышло. isPicking — пока открыто системное окно
// или идёт сжатие: отправлять в это время рано, снимки ещё не готовы.
export function usePhotoPicker({ getRemaining, onPicked }: UsePhotoPickerOptions) {
  const [isPicking, setIsPicking] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const add = async (pick: (limit: number) => Promise<UploadFile[] | null>) => {
    setIsPicking(true)
    try {
      const files = await pick(getRemaining())
      if (files?.length) onPicked(files)
    } catch (error) {
      toast.error(
        error instanceof CameraPermissionError ? error.message : 'Не удалось добавить фото. Попробуйте выбрать другие'
      )
    } finally {
      setIsPicking(false)
    }
  }

  const sourceActions: SheetAction[] = [
    { key: 'camera', label: 'Сделать фото', onPress: () => void add(() => takePhoto()) },
    { key: 'gallery', label: 'Выбрать из галереи', onPress: () => void add(pickPhotos) }
  ]

  return {
    isPicking,
    isSheetOpen,
    openSheet: () => setIsSheetOpen(true),
    closeSheet: () => setIsSheetOpen(false),
    sourceActions
  }
}
