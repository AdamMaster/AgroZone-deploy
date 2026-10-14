import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'

import { ActionSheet } from '@/shared/components/action-sheet'
import { StyledImage } from '@/shared/components/styled'
import { usePhotoPicker } from '@/shared/hooks/use-photo-picker'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ImagePlus, SendHorizontal, X } from '@/shared/icons/lucide'

import type { UploadFile } from '@/lib/api/upload-file'

interface MessageComposerProps {
  // Отправить сообщение; вернёт true, если отправка удалась (текст и фото
  // очищаются только тогда — набранное не теряется при ошибке сети).
  onSend: (text: string, photos: UploadFile[]) => Promise<boolean>
  isSending: boolean
  placeholder?: string
  // Диалоги по объявлениям — с фото; чат поддержки — только текст.
  allowPhotos?: boolean
}

// Тот же предел, что у сервера (SendMessageDto, @MaxLength(2000)).
const MAX_LENGTH = 2000
// Счётчик — только когда до предела близко, как на сайте.
const COUNTER_THRESHOLD = 200
// Фото в одном сообщении — как CHAT_MAX_PHOTOS на сервере.
const MAX_PHOTOS = 5

interface PendingPhoto {
  id: number
  file: UploadFile
}

let pendingPhotoCounter = 0

// Поле сообщения, кнопка «Прикрепить фото» (диалоги по объявлениям) и кнопка
// «Отправить» — как MessageComposer сайта.
export function MessageComposer({
  onSend,
  isSending,
  placeholder = 'Сообщение...',
  allowPhotos
}: MessageComposerProps) {
  const iconColor = useThemeColor('--color-gray-900')
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const trimmed = text.trim()
  const remaining = MAX_LENGTH - text.length

  // Пока снимки сжимаются, пользователь мог убрать фото — лимит считаем по
  // актуальному списку.
  const latestPhotosRef = useRef(photos)
  useEffect(() => {
    latestPhotosRef.current = photos
  }, [photos])

  const { isPicking, isSheetOpen, openSheet, closeSheet, sourceActions } = usePhotoPicker({
    getRemaining: () => MAX_PHOTOS - latestPhotosRef.current.length,
    onPicked: files =>
      setPhotos(current =>
        [...current, ...files.map(file => ({ id: (pendingPhotoCounter += 1), file }))].slice(0, MAX_PHOTOS)
      )
  })

  // Пока снимки сжимаются, отправлять рано: сообщение ушло бы без них.
  const canSend = (trimmed.length > 0 || photos.length > 0) && !isSending && !isPicking
  const canAttach = !isSending && !isPicking && photos.length < MAX_PHOTOS

  const send = async () => {
    if (!canSend) return

    if (
      await onSend(
        trimmed,
        photos.map(photo => photo.file)
      )
    ) {
      setText('')
      setPhotos([])
    }
  }

  return (
    <View className='gap-1'>
      {/* Всегда в дереве: появление соседа у TextInput в момент ввода на
          Android сбрасывает его фокус и прячет клавиатуру. */}
      <View className={photos.length > 0 ? 'flex-row flex-wrap gap-2' : 'hidden'}>
        {photos.map(photo => (
          <View key={photo.id} className='size-16 overflow-hidden rounded-lg border border-border bg-gray-100'>
            <StyledImage source={{ uri: photo.file.uri }} className='size-full' contentFit='cover' />
            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Убрать фото'
              hitSlop={6}
              onPress={() => setPhotos(current => current.filter(item => item.id !== photo.id))}
              className='absolute top-0.5 right-0.5 size-5 items-center justify-center rounded-full bg-black/50'
            >
              <X size={12} color='#ffffff' />
            </Pressable>
          </View>
        ))}
      </View>
      <View className='flex-row items-end gap-2'>
        {allowPhotos && (
          <Pressable
            accessibilityRole='button'
            accessibilityLabel={isPicking ? 'Обрабатываем фото' : 'Прикрепить фото'}
            accessibilityState={{ disabled: !canAttach, busy: isPicking }}
            disabled={!canAttach}
            onPress={openSheet}
            className='size-12 items-center justify-center rounded-lg border border-border active:bg-gray-50 disabled:opacity-50'
          >
            {isPicking ? (
              <ActivityIndicator colorClassName='accent-gray-900' />
            ) : (
              <ImagePlus size={22} color={iconColor} />
            )}
          </Pressable>
        )}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColorClassName='accent-gray-400'
          accessibilityLabel={placeholder}
          multiline
          // Поле начинается с одной строки и растёт с текстом (до max-h-32).
          numberOfLines={1}
          maxLength={MAX_LENGTH}
          textAlignVertical='center'
          className='max-h-32 min-h-12 flex-1 rounded-lg border border-border bg-gray-50 px-4 py-3 text-base text-gray-950'
        />
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Отправить'
          accessibilityState={{ disabled: !canSend, busy: isSending }}
          disabled={!canSend}
          onPress={() => void send()}
          className='size-12 items-center justify-center rounded-lg bg-primary active:opacity-80 disabled:opacity-50'
        >
          <SendHorizontal size={20} color='#ffffff' />
        </Pressable>
      </View>
      {remaining <= COUNTER_THRESHOLD && (
        <Text className={`self-end text-xs ${remaining <= 0 ? 'text-red-500' : 'text-gray-400'}`}>
          {text.length}/{MAX_LENGTH}
        </Text>
      )}
      {allowPhotos && <ActionSheet visible={isSheetOpen} actions={sourceActions} onClose={closeSheet} />}
    </View>
  )
}
