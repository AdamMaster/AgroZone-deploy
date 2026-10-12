import { View } from 'react-native'

import { Button } from '@/shared/components/button'
import { Dialog } from '@/shared/components/dialog'

interface SupportAdminClearDialogProps {
  visible: boolean
  isClearing: boolean
  onConfirm: () => void
  onClose: () => void
}

// Подтверждение «Удалить все сообщения» — единственное разрушительное
// действие инбокса: стирается вся история обращения, необратимо, у обеих
// сторон (на сайте — window.confirm с тем же текстом).
export function SupportAdminClearDialog({ visible, isClearing, onConfirm, onClose }: SupportAdminClearDialogProps) {
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title='Удалить все сообщения?'
      description='Удалить все сообщения этого тикета? Действие необратимо и затронет обе стороны переписки.'
    >
      <View className='gap-2'>
        <Button variant='destructive-soft' size='sm' title='Удалить' isLoading={isClearing} onPress={onConfirm} />
        <Button variant='outline' size='sm' title='Отмена' disabled={isClearing} onPress={onClose} />
      </View>
    </Dialog>
  )
}
