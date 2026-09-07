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
      // Область нажатия — 32px (минимум по аудиту A1+A2, ROADMAP.md — 24px,
      // берём с запасом под палец), сама иконка внутри остаётся прежних
      // 16px (h-4 w-4) — размер иконки не меняем, только невидимый отступ
      // вокруг неё через flex-центрирование в увеличенной кнопке.
      className='absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center hover:bg-transparent'
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
