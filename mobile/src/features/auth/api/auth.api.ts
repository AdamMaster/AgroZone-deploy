import { apiClient } from '@/lib/api/api-client'

import type {
  AuthSession,
  RegisterCallStatus,
  RegisterStartResponse,
  TwoFactorRequired,
  UserProfile
} from '../types/auth.types'

interface LoginParams {
  login: string
  password: string
  // Код двухфакторной защиты — только на втором шаге входа.
  code?: string
  captchaToken: string
}

interface RegisterCompleteParams {
  phone: string
  code: string
  name: string
  password: string
  passwordRepeat: string
  personalDataConsent: boolean
}

interface OAuthExchangeResponse extends AuthSession {
  isNewUser: boolean
}

export const authApi = {
  // Капчу сервер ждёт в заголовке recaptcha (CaptchaGuard) — так же, как
  // от сайта.
  login: ({ captchaToken, ...body }: LoginParams) =>
    apiClient.post<AuthSession | TwoFactorRequired>('/auth/login', body, { headers: { recaptcha: captchaToken } }),

  registerStart: (phone: string) => apiClient.post<RegisterStartResponse>('/auth/register/sms/start', { phone }),

  registerCallStatus: (phone: string, signal?: AbortSignal) =>
    apiClient.post<RegisterCallStatus>('/auth/register/sms/status', { phone }, { signal }),

  registerComplete: (body: RegisterCompleteParams) => apiClient.post<AuthSession>('/auth/register/sms/complete', body),

  oauthConnect: (provider: 'yandex', params: { redirectUri: string; codeChallenge: string }) =>
    apiClient.get<{ url: string }>(`/auth/oauth/connect/${provider}`, { params }),

  oauthExchange: (body: { ticket: string; codeVerifier: string }) =>
    apiClient.post<OAuthExchangeResponse>('/auth/oauth/mobile/exchange', body),

  logout: () => apiClient.post<void>('/auth/logout', undefined, { expectBody: false }),

  getProfile: (signal?: AbortSignal) => apiClient.get<UserProfile>('/users/profile', { signal })
}

export function isTwoFactorRequired(response: AuthSession | TwoFactorRequired): response is TwoFactorRequired {
  return !('user' in response)
}
