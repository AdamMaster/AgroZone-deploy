'use client'

import { useMutation } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { usersAdminService } from '../services/users-admin.service'

// onSuccess тут не показывает toast сам (в отличие от большинства admin-
// мутаций, см. use-approve-dealer-feed.ts) — созданные телефон/пароль
// нужно показать администратору крупно и надолго на экране, чтобы он
// успел их скопировать и передать продавцу, а не мелькнувшим на пару
// секунд тостом. Экран успеха рисует CreateUserForm по данным мутации.
export function useCreateVerifiedUser() {
  const {
    mutate: createVerifiedUser,
    isPending: isCreatingVerifiedUser,
    data: createdUser,
    reset: resetCreatedUser
  } = useMutation({
    mutationKey: ['admin-create-verified-user'],
    mutationFn: usersAdminService.createVerified,
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { createVerifiedUser, isCreatingVerifiedUser, createdUser, resetCreatedUser }
}
