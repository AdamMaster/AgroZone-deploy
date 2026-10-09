import { apiClient } from '@/lib/api/api-client'

export const profileApi = {
  // У аккаунта с паролем сервер требует пароль для подтверждения; у
  // аккаунта только с входом через Яндекс пароля нет.
  deleteAccount: (password?: string) => apiClient.post<{ success: boolean }>('/users/profile/delete', { password })
}
