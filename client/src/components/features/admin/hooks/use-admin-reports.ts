'use client'

import { useQuery } from '@tanstack/react-query'

import { adReportsAdminService } from '../services/ad-reports-admin.service'

export function useAdminReports() {
  const query = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => adReportsAdminService.findAll()
  })

  return {
    reports: query.data ?? [],
    isLoading: query.isLoading
  }
}
