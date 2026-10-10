import type { ImageProps } from 'expo-image'
import { useState } from 'react'

import { type PhotoSize, photoUrl } from '@/shared/utils/photo-variants'

import { StyledImage } from './styled'

interface AdPhotoProps extends Omit<ImageProps, 'source'> {
  url: string
  // Какая копия нужна: под размер места на экране, а не оригинал 2000 px.
  size: PhotoSize
  className?: string
}

// Фото объявления нужного размера. Если копии нет (фото загружено до их
// появления и ещё не обработано на сервере) — показываем оригинал, а не
// пустое место.
export function AdPhoto({ url, size, onError, ...props }: AdPhotoProps) {
  // Запоминаем, для какой ссылки копия не нашлась: в переиспользуемой
  // ячейке списка компонент получает новое фото, и пробовать копию нужно
  // заново.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const uri = failedUrl === url ? url : photoUrl(url, size)

  return (
    <StyledImage
      {...props}
      source={{ uri }}
      onError={event => {
        if (uri !== url) setFailedUrl(url)
        onError?.(event)
      }}
    />
  )
}
