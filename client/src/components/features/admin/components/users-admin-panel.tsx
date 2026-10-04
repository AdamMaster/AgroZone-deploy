'use client'

import { useState } from 'react'

import { getAdminChipClassName } from '../constants/admin-ui.constants'
import { CreateUserForm } from './create-user-form'
import { UsersSearch } from './users-search'

type View = 'search' | 'create'

// Вкладка "Пользователи" в админке (/admin/users) — раньше здесь была
// только форма создания аккаунта (CreateUserForm), теперь плюс поиск/
// список (см. UsersSearch), с которого можно перейти на полную карточку
// пользователя (/admin/users/:id, см. UserAdminDetail) и в следующих
// итерациях управлять им (бан, premium, объявления — см. обсуждение).
// Переключатель — локальный state, а не отдельные роуты: это два
// равноправных режима одной вкладки, а не drill-down (в отличие от
// /admin/users/:id — та уже отдельная страница).
export const UsersAdminPanel = () => {
  const [view, setView] = useState<View>('search')

  return (
    <div className='text-mist-50'>
      <div className='mt-6 flex gap-1'>
        <button
          type='button'
          className={getAdminChipClassName(view === 'search')}
          onClick={() => setView('search')}
        >
          Поиск
        </button>
        <button
          type='button'
          className={getAdminChipClassName(view === 'create')}
          onClick={() => setView('create')}
        >
          Новый аккаунт
        </button>
      </div>

      {view === 'search' ? <UsersSearch /> : <CreateUserForm />}
    </div>
  )
}
