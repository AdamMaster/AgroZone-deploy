'use client'

import { useQuery } from '@tanstack/react-query'

import { usersAdminService } from '../services/users-admin.service'

// Карточка пользователя в админке (/admin/users/:id) — см.
// UsersAdminService.findById/UserController.findById.
export function useAdminUserDetail(id: string) {
  const query = useQuery({
    queryKey: ['admin-user-detail', id],
    queryFn: () => usersAdminService.findById(id),
    enabled: Boolean(id)
  })

  return {
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError
  }
}
