import { useState } from 'react'
import { View } from 'react-native'

import { useReportAd } from '@/features/ads/hooks/use-ad-detail'
import type { AdReportReason } from '@/features/ads/types/ad-detail.types'

import { Button } from '@/shared/components/button'
import { Dialog } from '@/shared/components/dialog'
import { FieldLabel } from '@/shared/components/field-label'
import { Input } from '@/shared/components/input'
import type { SheetOption } from '@/shared/components/options-sheet'
import { SelectField } from '@/shared/components/select-field'

// Причины — те же, что AD_REPORT_REASON_LABELS сайта.
const REASON_OPTIONS: readonly SheetOption<AdReportReason>[] = [
  { value: 'SCAM', label: 'Мошенничество' },
  { value: 'WRONG_CATEGORY', label: 'Не та категория' },
  { value: 'PROHIBITED_ITEM', label: 'Запрещённый товар' },
  { value: 'DUPLICATE', label: 'Дубликат объявления' },
  { value: 'SPAM', label: 'Спам / реклама' },
  { value: 'OTHER', label: 'Другое' }
]

// Как ограничение сервера (CreateAdReportDto.comment).
const MAX_COMMENT_LENGTH = 1000

interface ReportAdDialogProps {
  adId: string
  visible: boolean
  onClose: () => void
}

// Жалоба на объявление — как ReportAdDialog сайта: причина и
// необязательный комментарий.
export function ReportAdDialog({ adId, visible, onClose }: ReportAdDialogProps) {
  const [reason, setReason] = useState<AdReportReason>()
  const [comment, setComment] = useState('')
  const report = useReportAd()

  // Закрыли окно — следующая жалоба начинается с чистой формы.
  const close = () => {
    setReason(undefined)
    setComment('')
    onClose()
  }

  const submit = () => {
    if (!reason) return

    report.mutate({ id: adId, reason, comment: comment.trim() || undefined }, { onSuccess: close })
  }

  return (
    <Dialog
      visible={visible}
      onClose={close}
      title='Пожаловаться на объявление'
      description='Расскажите, что не так — мы проверим объявление.'
    >
      <View className='gap-4'>
        <View>
          <FieldLabel>Причина</FieldLabel>
          <SelectField
            width='full'
            value={reason}
            options={REASON_OPTIONS}
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
            maxLength={MAX_COMMENT_LENGTH}
          />
        </View>
      </View>
      <Button
        variant='secondary'
        title='Отправить жалобу'
        disabled={!reason}
        isLoading={report.isPending}
        onPress={submit}
      />
    </Dialog>
  )
}
