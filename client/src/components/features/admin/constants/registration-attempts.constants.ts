import {
  RegistrationAttemptChannel,
  RegistrationAttemptFilter,
  RegistrationAttemptPlatform,
  RegistrationAttemptStatus,
  RegistrationAttemptStep,
  RegistrationFailureReason
} from '../types/admin.types'

export const REGISTRATION_ATTEMPT_FILTERS: { id: RegistrationAttemptFilter; label: string }[] = [
  { id: 'problems', label: 'Проблемные' },
  { id: 'all', label: 'Все' },
  { id: 'completed', label: 'Завершили' }
]

export const REGISTRATION_CHANNEL_LABELS: Record<RegistrationAttemptChannel, string> = {
  PHONE: 'Телефон',
  EMAIL: 'Почта'
}

export const REGISTRATION_PLATFORM_LABELS: Record<RegistrationAttemptPlatform, string> = {
  SITE: 'Сайт',
  APP: 'Приложение',
  UNKNOWN: 'Не определено'
}

export const REGISTRATION_STATUS_LABELS: Record<RegistrationAttemptStatus, string> = {
  IN_PROGRESS: 'В процессе',
  FAILED: 'Ошибка',
  COMPLETED: 'Зарегистрировался',
  ABANDONED: 'Бросил на полпути'
}

export const REGISTRATION_STATUS_CLASSES: Record<RegistrationAttemptStatus, string> = {
  IN_PROGRESS: 'bg-sky-200 text-mist-950',
  FAILED: 'bg-red-300 text-mist-950',
  COMPLETED: 'bg-emerald-300 text-mist-950',
  ABANDONED: 'bg-amber-200 text-mist-950'
}

export const REGISTRATION_STEP_LABELS: Record<RegistrationAttemptStep, string> = {
  STARTED: 'ввёл данные',
  CONFIRMATION_SENT: 'получил подтверждение (звонок или письмо)',
  COMPLETED: 'регистрация завершена'
}

export const REGISTRATION_FAILURE_REASON_LABELS: Record<RegistrationFailureReason, string> = {
  ALREADY_REGISTERED: 'Номер или почта уже зарегистрированы',
  PROVIDER_ERROR: 'Ошибка сервиса звонков или почты',
  CODE_INVALID: 'Неверный код',
  CODE_EXPIRED: 'Код или номер для звонка устарел',
  CALL_NOT_RECEIVED: 'Звонок с подтверждением не поступил',
  LINK_EXPIRED: 'Ссылка из письма устарела',
  INVALID_DATA: 'Некорректные данные',
  UNKNOWN_ERROR: 'Неизвестная ошибка'
}
