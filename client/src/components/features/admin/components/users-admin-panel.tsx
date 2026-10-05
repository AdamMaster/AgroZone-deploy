'use client'

import { useState } from 'react'

import { getAdminChipClassName } from '../constants/admin-ui.constants'
import { CreateUserForm } from './create-user-form'
import { UsersSearch } from './users-search'

type View = 'search' | 'create'

export const UsersAdminPanel = () => {
  const [view, setView] = useState<View>('search')

  return (
    <div className='text-mist-50'>
      <div className='mt-6 flex gap-1'>
        <button type='button' className={getAdminChipClassName(view === 'search')} onClick={() => setView('search')}>
          Поиск
        </button>
        <button type='button' className={getAdminChipClassName(view === 'create')} onClick={() => setView('create')}>
          Новый аккаунт
        </button>
      </div>

      {view === 'search' ? <UsersSearch /> : <CreateUserForm />}
    </div>
  )
}
