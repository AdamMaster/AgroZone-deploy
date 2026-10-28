'use client'

import { useAppModal } from '@/store'
import Link from 'next/link'

import { Button } from '@/components/ui'

import { useProfile } from '@/shared/hooks'

// Подсказка под сообщением «ничего не найдено». Площадка новая, и пустая
// выдача здесь — обычное дело, а не ошибка: вместо тупика предлагаем
// разместить своё объявление и честно говорим, что объявлений пока немного.
// Это же снижает риск раздражения у новых посетителей, в том числе тех, кто
// пришёл из приложения.
//
// Гость, как и в HeaderActions, получает не ссылку на /ads/create, а модалку
// входа с возвратом на форму: сама страница создания не закрыта middleware.
export const EmptyAdsCta = () => {
  const { user } = useProfile()
  const { onOpen } = useAppModal()

  return (
    <div className='mx-auto mt-4 flex max-w-md flex-col items-center gap-3'>
      <p className='text-sm text-gray-500'>
        AgroZone только набирает обороты, и объявлений пока немного. Нужного нет? Разместите своё — его увидят
        покупатели.
      </p>
      {user ? (
        <Button render={<Link href='/ads/create' />} nativeButton={false}>
          Разместить объявление
        </Button>
      ) : (
        <Button onClick={() => onOpen('login', { returnTo: '/ads/create' })}>Разместить объявление</Button>
      )}
    </div>
  )
}
