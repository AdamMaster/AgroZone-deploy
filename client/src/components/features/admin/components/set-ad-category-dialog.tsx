'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { useCategories } from '@/components/features/categories/hooks/use-categories'
import { useCategoryFeatures } from '@/components/features/categories/hooks/use-category-features'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
  Heading,
  ScrollArea
} from '@/components/ui'

import { findCategoryById } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { DynamicField } from '../../ads/components/dynamic-field'
import { useSetAdCategoryByAdmin } from '../../ads/hooks'
import { TypeCreateAdSchema } from '../../ads/schemes'
import { ICategoryFeature } from '../../ads/types/ad.types'
import { reconcileCategoryFeatures } from '../../ads/utils/reconcile-category-features'
import { AdminCategorySearchField } from './admin-category-search-field'

interface SetAdCategoryDialogProps {
  adId: string
  userId: string
  categoryId: string
  features: Record<string, unknown>
  className?: string
}

// Пустая заготовка под остальные поля TypeCreateAdSchema — DynamicField
// типизирован под ПОЛНУЮ форму продавца (Control<TypeCreateAdSchema>), а не
// под урезанный тип "только характеристики категории" — своей формы под
// одно поле не заводим, чтобы не форкать типы DynamicField. zodResolver
// сюда намеренно не подключаем и form.handleSubmit не вызываем ни разу —
// остальные поля существуют только для типов, реального значения не имеют.
// categoryId в форме тоже не используется намеренно (см. комментарий у
// selectedCategoryId ниже) — единственный источник правды для выбранной
// категории это стейт компонента, а не форма.
const EMPTY_FORM_DEFAULTS: TypeCreateAdSchema = {
  title: '',
  description: '',
  address: '',
  lat: 0,
  lng: 0,
  phone: '',
  unit: 'ITEM',
  images: [],
  categoryId: '',
  categoryFeatures: {}
}

// Ручная смена категории (вместе с характеристиками) объявления с карточки
// пользователя в админке (/admin/users/:id) — см.
// AdsService.setCategoryByAdmin на бэкенде.
//
// Выбор категории тут — AdminCategorySearchField, отдельный от
// CategoryCascader компонент (обсуждали с пользователем отдельно: пытались
// научить сам CategoryCascader работать в узкой модалке через
// full/compact-режим, получившийся компонент с пересекающимися флагами и
// мёртвым стейтом вышел трудно читаемым — решили не тащить это дальше).
// AdminCategorySearchField переиспользует те же хуки, что и
// CategoryCascader (useCategorySearchSuggest, useCategoryFeaturesLoader),
// так что реальная бизнес-логика — поиск с семантическими подсказками и
// догрузка CategoryFeature выбранной категории — не задублирована, только
// разметка и общая компоновка у компонентов разные.
//
// Список полей характеристик (DynamicField) переиспользуется как есть, тот
// же, что и в форме продавца — включая фикс "не тащить характеристики
// старой категории в новую" (см. reconcileCategoryFeatures).
//
// Смена категории НЕ отправляет объявление на повторную модерацию — это
// решение уже принял сам администратор своим действием (обсуждали с
// пользователем отдельно), в отличие, например, от обычного редактирования
// объявления продавцом (AdsService.update), которое переводит его обратно
// в PENDING.
export const SetAdCategoryDialog = ({ adId, userId, categoryId, features, className }: SetAdCategoryDialogProps) => {
  const [open, setOpen] = useState(false)
  const { categories } = useCategories()
  const { setCategory, isLoadingSetCategory } = useSetAdCategoryByAdmin()

  // Единственный источник правды для выбранной категории в рамках этого
  // диалога — AdminCategorySearchField controlled-снаружи именно им, а не
  // полем формы (в отличие от CategoryCascader, который пишет выбор в саму
  // форму продавца). Инициализируется текущей категорией объявления при
  // каждом открытии диалога (см. handleOpenChange).
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId)

  const form = useForm<TypeCreateAdSchema>({ defaultValues: EMPTY_FORM_DEFAULTS })

  // Определения характеристик ТЕКУЩЕЙ категории объявления — нужны как
  // "старая категория" для reconcileCategoryFeatures, если админ решит
  // сменить категорию ещё раз в рамках этого же открытия диалога, и чтобы
  // сразу показать поля объявления как они есть (можно поправить значение,
  // не меняя категорию вовсе).
  const { features: currentCategoryFeatureDefs } = useCategoryFeatures(open ? categoryId : undefined)

  // null = админ ещё не выбирал новую категорию в рамках этого открытия
  // диалога — тогда показываем характеристики ИСХОДНОЙ категории объявления
  // (currentCategoryFeatureDefs, из запроса выше). После выбора новой
  // категории — характеристики новой, из onSelect у AdminCategorySearchField.
  // Чисто derived-значение в рендере, без useEffect с setState внутри (в
  // проекте включено правило react-hooks/set-state-in-effect, тот же приём,
  // что и в CaliberInput в dynamic-field.tsx) — заодно устраняет гонку,
  // которая была бы возможна через useEffect, если бы админ успел выбрать
  // новую категорию раньше, чем разрешится запрос характеристик исходной.
  const [manualFeatureDefs, setManualFeatureDefs] = useState<ICategoryFeature[] | null>(null)
  const categoryFeatureDefs = manualFeatureDefs ?? currentCategoryFeatureDefs

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (nextOpen) {
      setSelectedCategoryId(categoryId)
      setManualFeatureDefs(null)
      form.reset({ ...EMPTY_FORM_DEFAULTS, categoryFeatures: features })

      const category = findCategoryById(categories, categoryId)
      if (category?.priceUnits?.length) {
        form.setValue('unit', category.priceUnits[0])
      }
    } else {
      setManualFeatureDefs(null)
    }
  }

  const handleSave = () => {
    if (!selectedCategoryId) return

    const values = form.getValues()

    setCategory(
      {
        id: adId,
        userId,
        categoryId: selectedCategoryId,
        features: values.categoryFeatures ?? {},
        unit: values.unit ?? 'ITEM'
      },
      { onSuccess: () => setOpen(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type='button' variant='mist' size='sm' className={cn(className)} />}>
        Категория
      </DialogTrigger>

      <DialogContent className='max-w-140 overflow-auto p-0'>
        <ScrollArea className='max-h-[85vh] p-4'>
          <div className='flex flex-col gap-4'>
            <DialogHeader>
              <Heading level={3}>Категория объявления</Heading>
              <DialogDescription>
                Смена категории не отправляет объявление на повторную модерацию — считаем, что это решение уже приняли
                вы. Характеристики, которых нет в новой категории, будут очищены; общие для обеих категорий поля
                останутся как есть.
              </DialogDescription>
            </DialogHeader>

            <AdminCategorySearchField
              categories={categories}
              categoryId={selectedCategoryId}
              onSelect={(catId, selectedFeatures, selectedPriceUnits) => {
                const reconciled = reconcileCategoryFeatures(
                  form.getValues('categoryFeatures'),
                  categoryFeatureDefs,
                  selectedFeatures
                )
                form.setValue('categoryFeatures', reconciled)
                setManualFeatureDefs(selectedFeatures)
                form.setValue('unit', selectedPriceUnits[0] ?? 'ITEM')
                setSelectedCategoryId(catId)
              }}
            />

            {selectedCategoryId && categoryFeatureDefs.length > 0 && (
              <div className='flex flex-col gap-1'>
                {categoryFeatureDefs.map(f => (
                  <DynamicField key={f.name} feature={f} control={form.control} />
                ))}
              </div>
            )}

            <div>
              <Button
                type='button'
                disabled={!selectedCategoryId || isLoadingSetCategory}
                onClick={handleSave}
                className='bg-mist-900 hover:bg-mist-800'
                size='lg'
              >
                {isLoadingSetCategory ? 'Сохраняем...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
