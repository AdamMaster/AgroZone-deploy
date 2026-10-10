import { View } from 'react-native'

import { Button } from '@/shared/components/button'
import { Dialog } from '@/shared/components/dialog'

interface RemoveAdDialogProps {
  visible: boolean
  adTitle: string
  isRemoving: boolean
  onConfirm: () => void
  onClose: () => void
}

// Подтверждение удаления — как AdRemoveConfirmDialog сайта.
export function RemoveAdDialog({ visible, adTitle, isRemoving, onConfirm, onClose }: RemoveAdDialogProps) {
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title='Удалить объявление?'
      description={`«${adTitle}» будет удалено безвозвратно вместе с фотографиями. Действие нельзя отменить.`}
    >
      <View className='gap-2'>
        <Button variant='destructive-soft' size='sm' title='Удалить' isLoading={isRemoving} onPress={onConfirm} />
        <Button variant='outline' size='sm' title='Отмена' disabled={isRemoving} onPress={onClose} />
      </View>
    </Dialog>
  )
}
