import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { toast } from 'sonner-native'

import { AddressInput } from '@/features/address/components/address-input'
import { useProfile } from '@/features/auth/hooks/use-profile'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { useCategoryFeatures } from '@/features/categories/hooks/use-category-features'
import { findCategoryPathById } from '@/features/categories/lib/category-tree'
import type { CategoryFeature } from '@/features/categories/types/category.types'

import { Button } from '@/shared/components/button'
import { FormField } from '@/shared/components/form-field'
import { FormScrollView } from '@/shared/components/form-scroll-view'
import { Heading } from '@/shared/components/heading'
import { Input } from '@/shared/components/input'
import { SelectField } from '@/shared/components/select-field'
import { PRICE_UNITS, WHOLE_PRICE_UNIT } from '@/shared/constants/price-units'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ArrowLeft } from '@/shared/icons/lucide'
import { isFutureDate } from '@/shared/utils/date'
import { formatPhoneInput } from '@/shared/utils/phone'

import { useCreateAd, useSaveDraft, useUpdateAd } from '../hooks/use-ad-form-mutations'
import { type NewPhotosField, buildAdFormData } from '../lib/build-ad-form-data'
import { normalizeFeatureUnits, reconcileCategoryFeatures, restoreSellerUnits } from '../lib/feature-values'
import { type AdFormFields, type AdFormValues, adFormSchema } from '../schemas/ad-form.schema'
import type { EditableAd } from '../types/ad-form.types'
import { CategoryStep } from './category-step'
import { FeatureField } from './feature-field'
import { PhoneField } from './phone-field'
import { PhotoUploader } from './photo-uploader'
import { RejectionReason } from './rejection-reason'

type AdFormProps = { mode: 'create' } | { mode: 'edit'; ad: EditableAd }

// Сколько фото без премиума — на случай, если профиль ещё не загрузился.
const DEFAULT_PHOTO_LIMIT = 5

const EMPTY_VALUES: AdFormFields = {
  title: '',
  description: '',
  price: '',
  unit: WHOLE_PRICE_UNIT,
  photos: [],
  address: '',
  location: null,
  phone: '',
  categoryId: '',
  categoryFeatures: {}
}

function valuesFromAd(ad: EditableAd): AdFormFields {
  return {
    title: ad.title,
    description: ad.description,
    price: ad.price === null ? '' : String(ad.price),
    unit: ad.unit,
    photos: ad.images.map(url => ({ kind: 'remote', id: url, url })),
    address: ad.address,
    location: {
      lat: ad.lat,
      lng: ad.lng,
      region: ad.region ?? undefined,
      regionIsoCode: ad.regionIsoCode ?? undefined,
      locality: ad.locality ?? undefined,
      localityFiasId: ad.localityFiasId ?? undefined
    },
    phone: ad.phone ? formatPhoneInput(ad.phone) : '',
    categoryId: ad.categoryId,
    categoryFeatures: restoreSellerUnits(ad.features ?? {})
  }
}

// Подача и правка объявления — AdForm сайта на телефоне. Новое объявление —
// в два шага: категория, затем поля; правка — сразу поля (категорию меняет
// только модератор). Сверху — «назад» и быстрое действие, внизу — кнопки
// отправки и черновика.
export function AdForm(props: AdFormProps) {
  const router = useRouter()
  const { top } = useSafeAreaInsets()
  const iconColor = useThemeColor('--color-gray-900')
  const ad = props.mode === 'edit' ? props.ad : null
  const isEdit = !!ad
  const isDraft = ad?.status === 'DRAFT'
  const isRejected = ad?.status === 'REJECTED'
  const { data: profile } = useProfile()
  const { roots } = useCategories()
  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1)
  const [selectedFeatures, setSelectedFeatures] = useState<readonly CategoryFeature[]>([])
  const editFeatures = useCategoryFeatures(ad?.categoryId)
  const features = isEdit ? editFeatures : selectedFeatures
  const [isPhotosProcessing, setIsPhotosProcessing] = useState(false)

  const form = useForm<AdFormFields, unknown, AdFormValues>({
    resolver: zodResolver(adFormSchema),
    defaultValues: ad ? valuesFromAd(ad) : EMPTY_VALUES
  })

  const createAd = useCreateAd()
  const updateAd = useUpdateAd(ad?.id ?? '')
  const saveDraft = useSaveDraft(isDraft ? ad.id : undefined)
  const isSubmitting = createAd.isPending || updateAd.isPending
  const isBusy = isSubmitting || saveDraft.isPending || isPhotosProcessing

  const categoryId = useWatch({ control: form.control, name: 'categoryId' })
  const categoryPath = useMemo(() => findCategoryPathById(roots, categoryId), [roots, categoryId])
  const category = categoryPath.at(-1)
  const priceUnits = category?.priceUnits?.length ? category.priceUnits : [WHOLE_PRICE_UNIT]

  // Номер для связи по умолчанию — основной номер аккаунта, как на сайте.
  useEffect(() => {
    if (profile?.primaryPhone && !form.getValues('phone')) {
      form.setValue('phone', formatPhoneInput(profile.primaryPhone))
    }
  }, [profile?.primaryPhone, form])

  const title = isEdit ? 'Редактирование' : 'Новое объявление'
  const submitTitle = isRejected ? 'Сохранить и отправить на проверку' : isEdit ? 'Сохранить' : 'Опубликовать'
  // «Сохранить и выйти» — для нового объявления и черновика: их нормально
  // дозаполнить потом. Опубликованное сохраняется только целиком.
  const canSaveDraft = !isEdit || isDraft

  const leaveToMyAds = useCallback(() => router.navigate('/my-ads'), [router])

  const selectCategory = (nextCategoryId: string, nextFeatures: CategoryFeature[]) => {
    const nextPath = findCategoryPathById(roots, nextCategoryId)
    const nextUnits = nextPath.at(-1)?.priceUnits

    form.setValue(
      'categoryFeatures',
      reconcileCategoryFeatures(form.getValues('categoryFeatures'), selectedFeatures, nextFeatures)
    )
    setSelectedFeatures(nextFeatures)
    form.setValue('unit', nextUnits?.[0] ?? WHOLE_PRICE_UNIT)
    form.setValue('categoryId', nextCategoryId, { shouldValidate: true })
  }

  // Назад со второго шага — к выбору категории (категория сбрасывается,
  // остальные поля сохраняются), как на сайте.
  const goBack = useCallback(() => {
    if (!isEdit && step === 2) {
      setStep(1)
      form.setValue('categoryId', '')
      form.setValue('categoryFeatures', {})
      setSelectedFeatures([])
      return
    }

    router.back()
  }, [isEdit, step, form, router])

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack()
      return true
    })

    return () => subscription.remove()
  }, [goBack])

  const toBody = (values: AdFormValues, photosField: NewPhotosField, withExistingImages: boolean) =>
    buildAdFormData(values, normalizeFeatureUnits(values.categoryFeatures, features), photosField, withExistingImages)

  const showInvalid = () => toast.error('Проверьте поля объявления — некоторые заполнены неверно')

  const submit = form.handleSubmit(values => {
    if (ad) {
      updateAd.mutate({ body: toBody(values, 'images', true), wasRejected: isRejected }, { onSuccess: leaveToMyAds })
    } else {
      createAd.mutate(toBody(values, 'files', false), { onSuccess: leaveToMyAds })
    }
  }, showInvalid)

  const submitDraft = form.handleSubmit(
    values => saveDraft.mutate(toBody(values, 'files', true), { onSuccess: leaveToMyAds }),
    showInvalid
  )

  const isPremium = isFutureDate(profile?.premiumUntil)

  return (
    <View className='flex-1 bg-background' style={{ paddingTop: top }}>
      <View className='h-12 flex-row items-center justify-between px-4'>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Назад'
          onPress={goBack}
          className='-ml-2 size-10 items-center justify-center rounded-lg active:bg-gray-100'
        >
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        {step === 2 && (
          <Pressable
            accessibilityRole='button'
            disabled={isBusy}
            onPress={() => void (canSaveDraft ? submitDraft() : submit())}
            hitSlop={8}
            className='disabled:opacity-50'
          >
            <Text className='text-sm font-medium text-gray-500'>
              {canSaveDraft ? 'Сохранить и выйти' : submitTitle}
            </Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'padding' : undefined} className='flex-1'>
        <FormScrollView contentClassName='px-4 pb-10'>
          <View className='mb-6 gap-2'>
            <Heading level={2}>{title}</Heading>
            {ad?.rejectionReason && <RejectionReason text={ad.rejectionReason} />}
          </View>

          {step === 1 && <CategoryStep roots={roots} selectedName={category?.name ?? null} onSelect={selectCategory} />}

          {step === 2 && (
            <View className='gap-4'>
              <Controller
                control={form.control}
                name='title'
                render={({ field, fieldState }) => (
                  <FormField label='Название объявления' error={fieldState.error?.message}>
                    <Input
                      ref={field.ref}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      accessibilityLabel='Название объявления'
                    />
                  </FormField>
                )}
              />

              <View className='flex-row gap-3'>
                <View className='flex-1'>
                  <Controller
                    control={form.control}
                    name='price'
                    render={({ field, fieldState }) => (
                      <FormField label='Цена' error={fieldState.error?.message}>
                        <Input
                          ref={field.ref}
                          value={field.value}
                          onChangeText={text => field.onChange(text.replace(/[^\d.,\s]/g, ''))}
                          onBlur={field.onBlur}
                          placeholder='₽'
                          keyboardType='decimal-pad'
                          accessibilityLabel='Цена'
                        />
                      </FormField>
                    )}
                  />
                </View>
                <Controller
                  control={form.control}
                  name='unit'
                  render={({ field }) => (
                    <FormField label='Единица'>
                      <SelectField
                        value={field.value}
                        options={priceUnits.map(unit => ({ value: unit, label: PRICE_UNITS[unit] ?? unit }))}
                        onChange={field.onChange}
                        accessibilityLabel='Единица цены'
                        placeholder='Единица цены'
                      />
                    </FormField>
                  )}
                />
              </View>

              <Controller
                control={form.control}
                name='description'
                render={({ field, fieldState }) => (
                  <FormField label='Описание' error={fieldState.error?.message}>
                    <Input
                      ref={field.ref}
                      multiline
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      accessibilityLabel='Описание'
                    />
                  </FormField>
                )}
              />

              <Controller
                control={form.control}
                name='photos'
                render={({ field }) => (
                  <PhotoUploader
                    photos={field.value}
                    onChange={field.onChange}
                    maxFiles={profile?.maxUploadLimit ?? DEFAULT_PHOTO_LIMIT}
                    isPremium={isPremium}
                    isProcessing={isPhotosProcessing}
                    onProcessingChange={setIsPhotosProcessing}
                  />
                )}
              />

              <Controller
                control={form.control}
                name='address'
                render={({ field, fieldState }) => (
                  <AddressInput
                    label='Местоположение'
                    placeholder='Начните вводить адрес (например: г. Чехов, ул. Ленина...)'
                    text={field.value}
                    onChangeText={text => {
                      field.onChange(text)
                      // Адрес поменяли руками — прежняя точка ему больше не соответствует.
                      if (form.getValues('location')) form.setValue('location', null)
                    }}
                    onPick={({ address, lat, lng, region, regionIsoCode, locality, localityFiasId }) => {
                      field.onChange(address)
                      form.setValue(
                        'location',
                        { lat, lng, region, regionIsoCode, locality, localityFiasId },
                        { shouldValidate: true }
                      )
                    }}
                    error={fieldState.error?.message ?? form.formState.errors.location?.message}
                  />
                )}
              />

              <Controller
                control={form.control}
                name='phone'
                render={({ field, fieldState }) => (
                  <PhoneField value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
                )}
              />

              {features.map(feature => (
                <FeatureField key={feature.name} feature={feature} control={form.control} />
              ))}
            </View>
          )}

          <View className='mt-6 flex-row flex-wrap gap-2'>
            {step === 1 && (
              <Button title='Продолжить' variant='secondary' disabled={!categoryId} onPress={() => setStep(2)} />
            )}
            {step === 2 && (
              <>
                {isEdit && <Button title='Отмена' variant='outline' onPress={() => router.back()} />}
                <Button
                  title={submitTitle}
                  variant='secondary'
                  isLoading={isSubmitting}
                  disabled={isBusy}
                  onPress={() => void submit()}
                />
                {canSaveDraft && (
                  <Button
                    title='Сохранить черновик'
                    variant='outline'
                    isLoading={saveDraft.isPending}
                    disabled={isBusy}
                    onPress={() => void submitDraft()}
                  />
                )}
              </>
            )}
          </View>
        </FormScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
