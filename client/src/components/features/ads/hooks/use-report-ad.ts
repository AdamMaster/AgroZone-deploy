'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services'
import { ICreateAdReportDto } from '../types/ad.types'

export function useReportAd() {
  const { mutate: reportAd, isPending: isReporting, isSuccess } = useMutation({
    mutationKey: ['report-ad'],
    mutationFn: ({ id, dto }: { id: string; dto: ICreateAdReportDto }) => adsService.report(id, dto),

    onSuccess() {
      toast.success('Жалоба отправлена, спасибо — мы её рассмотрим')
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { reportAd, isReporting, isSuccess }
}
