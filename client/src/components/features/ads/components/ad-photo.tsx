'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

import { hasPhotoVariants, photoCardUrl, photoLoader } from '@/shared/utils/photo-variants'

type AdPhotoProps = Omit<ImageProps, 'src' | 'loader' | 'unoptimized'> & {
  src: string
  // 'card' — квадратная копия для квадратных карточек ленты (см.
  // photoCardUrl): одна готовая картинка без подбора размера под экран.
  // Без неё — копии 400/800/1280 по ширине (srcset по `sizes`).
  variant?: 'card'
}

// Фото объявления: готовые копии из хранилища (см. shared/utils/
// photo-variants) вместо оригинала, который гнал бы через оптимизатор наш
// сервер — тот на каждое фото тратит процессор на перекодирование и теряет
// кэш при каждом деплое.
//
// Если копии у фото нет (загружено до их появления и скрипт
// images:generate-variants ещё не запускали) и хранилище отвечает 404,
// компонент один раз возвращается к обычному оптимизатору для оригинала —
// фото не пропадает. `sizes` у карточек нужен именно для этого запасного
// пути.
export const AdPhoto = ({ src, alt, variant, onError, ...props }: AdPhotoProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const isVariantUsed = hasPhotoVariants(src) && failedSrc !== src
  const isCard = isVariantUsed && variant === 'card'

  return (
    <Image
      {...props}
      src={isCard ? photoCardUrl(src) : src}
      alt={alt}
      loader={isVariantUsed && !isCard ? photoLoader : undefined}
      unoptimized={isCard}
      onError={event => {
        if (isVariantUsed) setFailedSrc(src)

        onError?.(event)
      }}
    />
  )
}
