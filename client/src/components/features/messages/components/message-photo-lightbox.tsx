'use client'

import dynamic from 'next/dynamic'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import {
  MOBILE_LIGHTBOX_CAROUSEL,
  MOBILE_LIGHTBOX_RENDER,
  MOBILE_LIGHTBOX_TOOLBAR,
  isTouchDevice
} from '@/shared/utils'

import 'yet-another-react-lightbox/styles.css'

// Просмотрщик грузится при первом открытии фото — незачем тянуть его в
// бандл переписки, если ни одно фото не открывали.
const Lightbox = dynamic(() => import('yet-another-react-lightbox'), { ssr: false })

interface MessagePhotoLightboxProps {
  photos: string[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

// Фото сообщения на весь экран — те же настройки, что у галереи объявления.
export const MessagePhotoLightbox = ({ photos, index, onIndexChange, onClose }: MessagePhotoLightboxProps) => (
  <Lightbox
    open
    close={onClose}
    index={index}
    slides={photos.map(src => ({ src }))}
    plugins={[Zoom]}
    on={{ view: ({ index: viewIndex }) => onIndexChange(viewIndex) }}
    animation={isTouchDevice() ? undefined : { swipe: 0 }}
    render={isTouchDevice() ? MOBILE_LIGHTBOX_RENDER : undefined}
    toolbar={isTouchDevice() ? MOBILE_LIGHTBOX_TOOLBAR : undefined}
    carousel={isTouchDevice() ? MOBILE_LIGHTBOX_CAROUSEL : undefined}
    styles={{ slide: { maxWidth: 1280, margin: '0 auto' } }}
  />
)
