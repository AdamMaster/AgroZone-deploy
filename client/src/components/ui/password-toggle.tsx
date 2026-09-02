import { Eye, EyeOff } from 'lucide-react'
import { PropsWithChildren } from 'react'

interface PasswordToggleProps {
  isShow: boolean
  onClick?: () => void
}

export const PasswordToggle = ({ isShow, onClick }: PropsWithChildren<PasswordToggleProps>) => {
  return (
    <button
      type='button'
      className='absolute top-1/2 right-2.5 h-auto -translate-y-[50%] hover:bg-transparent'
      onClick={onClick}
      aria-label={isShow ? 'Скрыть пароль' : 'Показать пароль'}
    >
      {isShow ? (
        <Eye className='text-muted-foreground h-4 w-4' />
      ) : (
        <EyeOff className='text-muted-foreground h-4 w-4' />
      )}
    </button>
  )
}
