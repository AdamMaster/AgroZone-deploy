'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adReportsAdminService } from '../services/ad-reports-admin.service'
import { AdReportStatus } from '../types/admin.types'

export function useUpdateReportStatus() {
  const queryClient = useQueryClient()

  const { mutate: updateReportStatus, isPending: isUpdating } = useMutation({
    mutationKey: ['update-report-status'],
    mutationFn: ({ id, status }: { id: string; status: AdReportStatus }) =>
      adReportsAdminService.updateStatus(id, status),

    onSuccess() {
      toast.success('Статус жалобы обновлён')
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { updateReportStatus, isUpdating }
}
