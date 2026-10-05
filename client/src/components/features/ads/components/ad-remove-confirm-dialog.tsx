'use client'

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Heading
} from '@/components/ui'

interface AdRemoveConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  adTitle: string
  isLoading: boolean
  onConfirm: () => void
}

// Подтверждение удаления собственного объявления из личного кабинета
// (AdShortCard). Удаление необратимо: вместе с записью стираются и фото в
// хранилище, поэтому случайный клик в меню «Ещё» не должен удалять сразу.
// Диалог управляется снаружи (open/onOpenChange), потому что открывается из
// пункта выпадающего меню, а не из собственной кнопки-триггера.
export const AdRemoveConfirmDialog = ({
  open,
  onOpenChange,
  adTitle,
  isLoading,
  onConfirm
}: AdRemoveConfirmDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-100'>
        <DialogHeader>
          <Heading level={4} className='font-medium'>
            Удалить объявление?
          </Heading>
          <DialogDescription>
            «{adTitle}» будет удалено безвозвратно вместе с фотографиями. Действие нельзя отменить.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className='bg-transparent'>
          <DialogClose render={<Button type='button' variant='outline' disabled={isLoading} />}>Отмена</DialogClose>
          <Button type='button' variant='destructive' disabled={isLoading} onClick={onConfirm}>
            {isLoading ? 'Удаляем...' : 'Удалить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
