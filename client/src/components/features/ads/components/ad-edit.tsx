'use client'

import { useRouter } from 'next/navigation'

import { Loading } from '@/components/ui'

import { formatPhoneNumber } from '@/shared/utils'

import { useMyAd, useUpdateAd } from '../hooks'
import { useSaveDraft } from '../hooks/use-save-draft-ad'
import { TypeCreateAdSchema } from '../schemes'
import { ICategory, ICategoryFeature } from '../types/ad.types'
import { buildAdFormData } from '../utils/build-ad-form-data'
import { AdForm } from './ad-form'

interface AdEditProps {
  id: string
  categories: ICategory[]
}

export const AdEdit = ({ id, categories }: AdEditProps) => {
  const { ad, isLoading: isLoadingAd } = useMyAd(id)
  const { updateAd, isLoadingUpdate } = useUpdateAd(id)
  const { saveDraft, isLoadingSaveDraft } = useSaveDraft(id)
  const router = useRouter()

  if (isLoadingAd || !ad) return <Loading />

  const initialData: TypeCreateAdSchema = {
    title: ad.title,
    description: ad.description,
    price: ad.price?.toString(),
    categoryId: ad.categoryId,
    address: ad.address,
    lat: ad.lat,
    lng: ad.lng,
    region: ad.region ?? undefined,
    regionIsoCode: ad.regionIsoCode ?? undefined,
    locality: ad.locality ?? undefined,
    localityFiasId: ad.localityFiasId ?? undefined,
    phone: formatPhoneNumber(ad.phone),
    images: ad.images,
    categoryFeatures: (ad.features as ICategoryFeature) || {}
  }

  type AdImage = File | string

  const appendImages = (data: FormData, images: AdImage[] = []) => {
    images.forEach(img => {
      if (img instanceof File) {
        data.append('images', img)
      } else {
        data.append('existingImages', img)
      }
    })
  }

  const onSubmit = (values: TypeCreateAdSchema) => {
    const formData = buildAdFormData(values)

    if ((values.images ?? []).length === 0) {
      formData.append('existingImages', '')
    } else {
      appendImages(formData, values.images)
    }
    updateAd(formData, ad.status === 'REJECTED')
  }

  // Тот же формат FormData, что и в AdCreate.onSaveDraft — это тот же
  // POST /ads/draft (см. AdsService.saveDraft), а не PATCH /ads/:id, что
  // использует onSubmit выше, поэтому и поле для новых файлов другое
  // ('files', а не 'images').
  const onSaveDraftSubmit = (values: Partial<TypeCreateAdSchema>) => {
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
      initialData={initialData}
      isSubmitting={isLoadingUpdate}
      isSaveDrafting={isLoadingSaveDraft}
      rejectionReason={ad.rejectionReason}
      isRejected={ad.status === 'REJECTED'}
      isDraft={ad.status === 'DRAFT'}
      onSubmit={onSubmit}
      onSaveDraft={onSaveDraftSubmit}
    />
  )
}
