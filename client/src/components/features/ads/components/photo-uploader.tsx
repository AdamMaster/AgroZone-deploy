'use client'

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ImagePlus, X } from 'lucide-react'
import Image from 'next/image'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Control, useController } from 'react-hook-form'
import { toast } from 'sonner'

import { Label } from '@/components/ui'

import { MAX_IMAGE_SIZE } from '../constants/ads.constants'
import { TypeCreateAdSchema } from '../schemes'

interface PhotoUploaderProps {
  control: Control<TypeCreateAdSchema>
  name: 'images'
  maxFiles: number
  isPremium?: boolean
}

// Элементы `images` — File (новые фото) вперемешку со строками-URL (уже
// загруженные, см. ad-edit.tsx) без собственного id. Раньше React key был
// индексом в массиве — это ломает drag-n-drop: после перестановки React не
// может понять, какой DOM-узел к какому файлу относится (dnd-kit сверяет
// элементы по стабильному id, а не по позиции). Для строки id — она сама
// (уже уникальна и стабильна). Для File — генерируем один раз при первой
// встрече и держим в Map на время жизни компонента (см. resolveItem).
type PhotoItem = File | string

interface SortablePhotoTileProps {
  id: string
  url: string
  onRemove: () => void
}

const SortablePhotoTile = ({ id, url, onRemove }: SortablePhotoTileProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative aspect-square touch-none overflow-hidden rounded-lg border ${
        isDragging ? 'z-10 opacity-70' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <Image src={url} alt='preview' className='h-full w-full object-cover' fill />
      <div className='absolute top-1 left-1 rounded-full bg-black/50 p-1 text-white'>
        <GripVertical size={14} />
      </div>
      <button
        type='button'
        onClick={e => {
          e.stopPropagation()
          onRemove()
        }}
        className='absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70'
      >
        <X size={14} />
      </button>
    </div>
  )
}

export const PhotoUploader = ({ control, name, maxFiles, isPremium }: PhotoUploaderProps) => {
  const { field } = useController<TypeCreateAdSchema, 'images'>({
    name,
    control
  })
  const inputRef = useRef<HTMLInputElement>(null)

  const currentFiles = useMemo<PhotoItem[]>(() => field.value ?? [], [field.value])
  const count = currentFiles.length

  const isLimitReached = count >= maxFiles

  const fileMetaRef = useRef(new Map<File, { id: string; url: string }>())
  const idCounterRef = useRef(0)
  const [items, setItems] = useState<{ item: PhotoItem; id: string; url: string }[]>([])

  useEffect(() => {
    const nextItems = currentFiles.map(item => {
      if (typeof item === 'string') return { item, id: item, url: item }

      const existing = fileMetaRef.current.get(item)
      if (existing) return { item, ...existing }

      const meta = { id: `file_${idCounterRef.current++}`, url: URL.createObjectURL(item) }
      fileMetaRef.current.set(item, meta)
      return { item, ...meta }
    })

    setItems(nextItems)

    const stillPresent = new Set(currentFiles.filter((item): item is File => item instanceof File))

    for (const [file, meta] of fileMetaRef.current) {
      if (!stillPresent.has(file)) {
        URL.revokeObjectURL(meta.url)
        fileMetaRef.current.delete(file)
      }
    }
  }, [currentFiles])

  useEffect(() => {
    const metaMap = fileMetaRef.current
    return () => {
      metaMap.forEach(meta => URL.revokeObjectURL(meta.url))
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const ids = items.map(i => i.id)
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    field.onChange(arrayMove(currentFiles, oldIndex, newIndex))
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    const currentFiles = field.value ?? []

    const oversizedFile = newFiles.find(file => file.size > MAX_IMAGE_SIZE)

    if (oversizedFile) {
      toast.error('Размер изображения не должен превышать 10 МБ')

      if (inputRef.current) inputRef.current.value = ''

      return
    }

    if (currentFiles.length + newFiles.length > maxFiles) {
      toast.error(`Можно загрузить не более ${maxFiles} фото`)
      return
    }

    field.onChange([...currentFiles, ...newFiles])

    if (inputRef.current) inputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    field.onChange(currentFiles.filter((_, i) => i !== index))
  }

  return (
    <div>
      <Label className='flex flex-col items-start sm:block'>
        Фотографии{' '}
        <span className='text-xs font-normal text-gray-500 sm:text-base'>
          (Объявления с фотографиями получают больше просмотров и откликов. Перетащите, чтобы изменить порядок.)
        </span>
      </Label>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
          <div className='grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2 md:grid-cols-5 md:gap-4'>
            {items.map(({ id, url }, index) => (
              <SortablePhotoTile key={id} id={id} url={url} onRemove={() => removeFile(index)} />
            ))}

            {currentFiles.length < maxFiles && (
              <button
                type='button'
                onClick={() => inputRef.current?.click()}
                className='hover:border-primary flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed text-sm text-gray-500 transition-colors'
              >
                <ImagePlus className='text-gray-900' />
              </button>
            )}

            <input
              ref={inputRef}
              type='file'
              multiple
              accept='image/*'
              className='hidden'
              onChange={handleFileChange}
            />
          </div>
        </SortableContext>
      </DndContext>
      {!isPremium && isLimitReached && (
        <div className='mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
          Вы достигли лимита в {maxFiles} фото. Приобретите
          <button type='button' className='ml-1 font-semibold underline hover:text-amber-900'>
            Premium аккаунт
          </button>
          , чтобы загружать больше фото.
        </div>
      )}
    </div>
  )
}
