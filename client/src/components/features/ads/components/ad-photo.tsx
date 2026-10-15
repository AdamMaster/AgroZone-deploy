'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

import { hasPhotoVariants, photoLoader } from '@/shared/utils/photo-variants'

type AdPhotoProps = Omit<ImageProps, 'src' | 'loader'> & { src: string }

// Фото объявления: next/image, который берёт готовые копии 400/800/1280 из
// хранилища (см. shared/utils/photo-variants), а не гонит оригинал через
// оптимизатор на нашем сервере — тот на каждое фото тратит процессор на
// перекодирование и теряет кэш при каждом деплое.
//
// Если копии у фото нет (загружено до их появления и скрипт
// images:generate-variants ещё не запускали) и хранилище отвечает 404,
// компонент один раз возвращается к обычному оптимизатору для оригинала —
// фото не пропадает.
export const AdPhoto = ({ src, alt, onError, ...props }: AdPhotoProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const isVariantUsed = hasPhotoVariants(src) && failedSrc !== src

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      loader={isVariantUsed ? photoLoader : undefined}
      onError={event => {
        if (isVariantUsed) setFailedSrc(src)

        onError?.(event)
      }}
    />
  )
}
