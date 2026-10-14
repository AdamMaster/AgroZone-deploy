'use client'

import { ImagePlus, Loader2, SendHorizontal, X } from 'lucide-react'
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui'
import { Textarea } from '@/components/ui/textarea'

import { compressImage } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { IMAGE_COMPRESSION, MAX_IMAGE_SIZE } from '../../ads/constants/ads.constants'
import { MAX_MESSAGE_PHOTOS } from '../constants/messages.constants'

interface MessageComposerBaseProps {
  isSending?: boolean
  placeholder?: string
  maxLength?: number
}

// Без allowPhotos композер — только текст (чат поддержки). С allowPhotos
// (диалоги по объявлениям) можно прикрепить фото; onSend тогда возвращает
// true, если сообщение отправлено: текст и фото очищаются только после
// успеха, при ошибке остаются, чтобы не набирать и не выбирать заново.
type MessageComposerProps = MessageComposerBaseProps &
  (
    | { allowPhotos?: false; onSend: (text: string) => void }
    | { allowPhotos: true; onSend: (text: string, photos: File[]) => Promise<boolean> }
  )

// Тот же лимит, что и в SendMessageDto/SendSupportMessageDto на бэкенде
// (class-validator @MaxLength(2000)) — держим в синхроне, чтобы фронт не
// разрешал набрать то, что бэк всё равно отклонит с ошибкой валидации уже
// после отправки. maxLength на самой textarea (ниже) не даёт напечатать
// или вставить текст длиннее лимита вообще — защищает и от случайного
// "скинуть по приколу текст на несколько страниц".
const DEFAULT_MAX_LENGTH = 2000

interface PendingPhoto {
  id: number
  file: File
  // Ссылка для превью — освобождается при удалении фото и после отправки.
  url: string
}

export const MessageComposer = ({
  onSend,
  allowPhotos,
  isSending,
  placeholder = 'Сообщение...',
  maxLength = DEFAULT_MAX_LENGTH
}: MessageComposerProps) => {
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  // Пока фото сжимаются, отправлять нельзя: сообщение ушло бы без них.
  const [isProcessing, setIsProcessing] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const nextPhotoIdRef = useRef(0)
  const photosRef = useRef(photos)

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => photosRef.current.forEach(photo => URL.revokeObjectURL(photo.url))
  }, [])

  const hasContent = !!text.trim() || photos.length > 0
  const isBusy = !!isSending || isProcessing

  const clearPhotos = () => {
    photos.forEach(photo => URL.revokeObjectURL(photo.url))
    setPhotos([])
  }

  const handleSend = async () => {
    if (!hasContent || isBusy) return

    const trimmed = text.trim()

    if (!allowPhotos) {
      onSend(trimmed)
      setText('')

      return
    }

    const isSent = await onSend(
      trimmed,
      photos.map(photo => photo.file)
    )

    if (isSent) {
      setText('')
      clearPhotos()
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const handleFilesChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    // Сбрасываем input сразу: иначе повторный выбор того же файла не вызовет
    // onChange. Сами File остаются валидными.
    event.target.value = ''

    if (files.length === 0) return

    if (files.some(file => !file.type.startsWith('image/'))) {
      toast.error('Можно прикреплять только фото')

      return
    }

    if (photosRef.current.length + files.length > MAX_MESSAGE_PHOTOS) {
      toast.error(`Можно прикрепить не более ${MAX_MESSAGE_PHOTOS} фото`)

      return
    }

    setIsProcessing(true)

    try {
      // По одному, а не Promise.all: распаковка нескольких 12-мегапиксельных
      // снимков одновременно может не поместиться в память слабого телефона.
      const compressed: File[] = []

      for (const file of files) {
        compressed.push(await compressImage(file, IMAGE_COMPRESSION))
      }

      // Лимит размера проверяем уже по сжатым файлам: фото в 15 МБ после
      // сжатия обычно проходит. Негодные пропускаем, остальные добавляем.
      const accepted = compressed.filter(file => file.size <= MAX_IMAGE_SIZE)

      if (accepted.length < compressed.length) {
        toast.error('Размер изображения не должен превышать 10 МБ')
      }

      setPhotos(current => [
        ...current,
        ...accepted.map(file => ({ id: nextPhotoIdRef.current++, file, url: URL.createObjectURL(file) }))
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  const removePhoto = (id: number) => {
    const removed = photos.find(photo => photo.id === id)

    if (removed) URL.revokeObjectURL(removed.url)

    setPhotos(current => current.filter(photo => photo.id !== id))
  }

  const remaining = maxLength - text.length
  // Счётчик показываем только когда до лимита действительно близко — не
  // загромождаем композер цифрами при обычной короткой переписке.
  const showCounter = remaining <= 200

  return (
    <div className='flex flex-col gap-1'>
      {photos.length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {photos.map(photo => (
            <div key={photo.id} className='relative size-16 overflow-hidden rounded-lg border'>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: превью локального файла, оптимизировать нечего */}
              <img src={photo.url} alt='Фото к сообщению' className='size-full object-cover' />
              <button
                type='button'
                onClick={() => removePhoto(photo.id)}
                aria-label='Убрать фото'
                className='absolute top-0.5 right-0.5 rounded-full bg-black/50 p-1 text-white hover:bg-black/70'
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className='flex items-end gap-2'>
        {allowPhotos && (
          <>
            <Button
              type='button'
              variant='outline'
              size='icon-lg'
              aria-label={isProcessing ? 'Обрабатываем фото' : 'Прикрепить фото'}
              className='size-12! rounded-lg!'
              onClick={() => inputRef.current?.click()}
              disabled={isBusy || photos.length >= MAX_MESSAGE_PHOTOS}
            >
              {isProcessing ? <Loader2 className='animate-spin' /> : <ImagePlus />}
            </Button>
            <input
              ref={inputRef}
              type='file'
              multiple
              accept='image/*'
              className='hidden'
              onChange={handleFilesChange}
            />
          </>
        )}
        <Textarea
          value={text}
          onChange={event => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          maxLength={maxLength}
          className='min-h-12 flex-1 resize-none px-4! py-3 wrap-anywhere placeholder:text-gray-400'
        />
        <Button
          size='icon-lg'
          aria-label='Отправить'
          className='size-12! rounded-lg!'
          onClick={handleSend}
          disabled={!hasContent || isBusy}
        >
          <SendHorizontal />
        </Button>
      </div>
      {showCounter && (
        <span className={cn('self-end text-xs', remaining <= 0 ? 'text-red-500' : 'text-gray-400')}>
          {text.length}/{maxLength}
        </span>
      )}
    </div>
  )
}
