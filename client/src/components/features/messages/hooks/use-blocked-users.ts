'use client'

import { useQuery } from '@tanstack/react-query'

import { blockedUsersService } from '../services/blocked-users.service'

export function useBlockedUsers() {
  const query = useQuery({
    queryKey: ['blocked-users'],
    queryFn: () => blockedUsersService.findAll()
  })

  return {
    blockedUsers: query.data ?? [],
    isLoading: query.isLoading
  }
}
