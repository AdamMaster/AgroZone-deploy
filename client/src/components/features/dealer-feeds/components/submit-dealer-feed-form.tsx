'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'

import { Button, Field, FieldDescription, FieldError, FieldGroup, Input, Label } from '@/components/ui'

import { useSubmitDealerFeed } from '../hooks'
import { SubmitDealerFeedSchema, TypeSubmitDealerFeedSchema } from '../schemes'

interface SubmitDealerFeedFormProps {
  currentUrl?: string
  submitLabel: string
}

// Используется и для первого подключения фида, и для смены ссылки на уже
// существующем (см. DealerFeedsService.submit на бэкенде — это всегда
// upsert, смена ссылки заново уводит фид на проверку).
export const SubmitDealerFeedForm = ({ currentUrl = '', submitLabel }: SubmitDealerFeedFormProps) => {
  const { submitDealerFeed, isSubmittingDealerFeed } = useSubmitDealerFeed()

  const form = useForm<TypeSubmitDealerFeedSchema>({
    resolver: zodResolver(SubmitDealerFeedSchema),
    defaultValues: { url: currentUrl }
  })

  const onSubmit = (values: TypeSubmitDealerFeedSchema) => {
    submitDealerFeed(values.url, { onSuccess: () => form.reset({ url: values.url }) })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name='url'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className='relative'>
              <Label className='mb-1'>Ссылка на XML-фид</Label>
              <Input {...field} placeholder='https://example.ru/export/feed.xml' />
              <FieldDescription>
                Формат — подмножество YML (Yandex Market Language). Категории указываются точным кодом — см. список
                в GET /categories.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} className='absolute -bottom-5 left-0' />}
            </Field>
          )}
        />

        <Button type='submit' disabled={isSubmittingDealerFeed} className='self-start'>
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  )
}
