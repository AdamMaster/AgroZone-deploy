import { useState } from 'react'
import { View } from 'react-native'

import { Button } from '@/shared/components/button'
import { Dialog } from '@/shared/components/dialog'
import { FieldLabel } from '@/shared/components/field-label'
import { Input } from '@/shared/components/input'
import type { SheetOption } from '@/shared/components/options-sheet'
import { SelectField } from '@/shared/components/select-field'

interface ReasonReportDialogProps<T extends string> {
  visible: boolean
  onClose: () => void
  title: string
  description: string
  options: readonly SheetOption<T>[]
  commentMaxLength: number
  isPending: boolean
  // onSuccess закрывает окно: вызывающий передаёт его в mutate, чтобы окно не
  // закрылось, если сервер отклонил жалобу (например, нет контакта с продавцом).
  onSubmit: (values: { reason: T; comment?: string }, onSuccess: () => void) => void
}

// Окно «причина + комментарий» для жалоб на отзыв и на продавца — по образцу
// ReportAdDialog для объявлений.
export function ReasonReportDialog<T extends string>({
  visible,
  onClose,
  title,
  description,
  options,
  commentMaxLength,
  isPending,
  onSubmit
}: ReasonReportDialogProps<T>) {
  const [reason, setReason] = useState<T>()
  const [comment, setComment] = useState('')

  // Закрыли окно — следующая жалоба начинается с чистой формы.
  const close = () => {
    setReason(undefined)
    setComment('')
    onClose()
  }

  const submit = () => {
    if (!reason) return

    onSubmit({ reason, comment: comment.trim() || undefined }, close)
  }

  return (
    <Dialog visible={visible} onClose={close} title={title} description={description}>
      <View className='gap-4'>
        <View>
          <FieldLabel>Причина</FieldLabel>
          <SelectField
            width='full'
            value={reason}
            options={options}
            onChange={setReason}
            placeholder='Выберите причину'
            accessibilityLabel='Причина'
          />
        </View>
        <View>
          <FieldLabel>Комментарий (необязательно)</FieldLabel>
          <Input
            multiline
            value={comment}
            onChangeText={setComment}
            placeholder='Дополнительные детали...'
            accessibilityLabel='Комментарий'
            maxLength={commentMaxLength}
          />
        </View>
      </View>
      <Button variant='secondary' title='Отправить жалобу' disabled={!reason} isLoading={isPending} onPress={submit} />
    </Dialog>
  )
}
