'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { SiteFlagKey } from '../../site-settings/types/site-settings.types'
import { SITE_FLAG_LABELS } from '../constants/site-flag-labels'
import { siteSettingsAdminService } from '../services/site-settings-admin.service'
import { ADMIN_SITE_SETTINGS_QUERY_KEY } from './use-admin-site-settings'

export function useUpdateSiteFlag() {
  const queryClient = useQueryClient()

  const { mutate: updateSiteFlag, isPending: isUpdating } = useMutation({
    mutationKey: ['update-site-flag'],
    mutationFn: ({ key, value }: { key: SiteFlagKey; value: boolean }) => siteSettingsAdminService.update(key, value),

    // Не оптимистично: переключатель двигается только когда сервер
    // подтвердил — иначе админ увидит «включено» там, где запись не прошла.
    // Историю изменений (журнал) обновляет invalidate.
    onSuccess(flag) {
      toast.success(`«${SITE_FLAG_LABELS[flag.key].title}» ${flag.value ? 'включено' : 'выключено'}`)
      queryClient.invalidateQueries({ queryKey: ADMIN_SITE_SETTINGS_QUERY_KEY })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { updateSiteFlag, isUpdating }
}
