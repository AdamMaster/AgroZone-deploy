import { create } from 'zustand'

type ModalView =
  | 'register'
  | 'register-sms'
  | 'login'
  | 'login-after-reset'
  | 'new-password'
  | 'code-message'
  | 'change-email'
  | 'change-email-message'
  | 'add-phone'
  | 'register-message'
  | 'register-sms-message'
  | 'change-password'
  | 'change-password-confirm'
  | 'delete-account'

interface AppModalStore {
  isOpen: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>
  view: ModalView

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onOpen: (view?: ModalView, props?: Record<string, any>) => void

  onClose: () => void

  setView: (view: ModalView) => void
}

export const useAppModal = create<AppModalStore>(set => ({
  isOpen: false,
  view: 'login',
  props: undefined,

  onOpen: (view = 'login', props) =>
    set({
      isOpen: true,
      view,
      props
    }),

  onClose: () =>
    set({
      isOpen: false,
      props: undefined
    }),

  setView: view =>
    set({
      view
    })
}))
