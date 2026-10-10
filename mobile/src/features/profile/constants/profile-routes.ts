// Разделы профиля в приложении — те же, что /profile/settings/* сайта.
export const PROFILE_ROUTES = {
  general: '/profile',
  security: '/profile/security',
  notifications: '/profile/notifications',
  personalization: '/profile/personalization',
  premium: '/profile/premium'
} as const

export type ProfileRoute = (typeof PROFILE_ROUTES)[keyof typeof PROFILE_ROUTES]
