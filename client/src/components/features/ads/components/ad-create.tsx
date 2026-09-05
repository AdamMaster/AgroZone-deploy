'use client'

import { useRouter } from 'next/navigation'

import { useCreateAd } from '../hooks'
import { useSaveDraft } from '../hooks/use-save-draft-ad'
import { TypeCreateAdSchema } from '../schemes'
import { ICategory } from '../types/ad.types'
import { buildAdFormData } from '../utils/build-ad-form-data'
import { AdForm } from './ad-form'

export const AdCreate = ({ categories }: { categories: ICategory[] }) => {
  const { createAd, isLoadingCreate } = useCreateAd()
  const { saveDraft, isLoadingSaveDraft } = useSaveDraft()
  const router = useRouter()

  const onSubmit = (values: TypeCreateAdSchema) => {
    const formData = buildAdFormData(values)

    // Как и в onSaveDraft ниже: images на этом этапе должны быть File[]
    // (PhotoUploader для новой карточки только их и кладёт), но
    // instanceof-проверка на всякий случай — чтобы шальная строка не
    // ушла в multipart-поле files как текстовое значение вместо бинарника.
    values.images?.forEach(img => {
      if (img instanceof File) {
        formData.append('files', img)
      }
    })

    createAd(formData)
  }

  const onSaveDraft = (values: Partial<TypeCreateAdSchema>) => {
    const formData = buildAdFormData(values)

    values.images?.forEach(img => {
      if (img instanceof File) {
        formData.append('files', img)
      } else if (typeof img === 'string') {
        formData.append('existingImages', img)
      }
    })

    saveDraft(formData, {
      onSuccess: () => {
        router.push('/profile/settings/ads')
      }
    })
  }

  return (
    <AdForm
      categories={categories}
      onSubmit={onSubmit}
      onSaveDraft={onSaveDraft}
      isSubmitting={isLoadingCreate}
      isSaveDrafting={isLoadingSaveDraft}
    />
  )
}
