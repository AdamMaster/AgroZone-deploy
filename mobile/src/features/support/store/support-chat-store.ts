import { create } from 'zustand'

// Значение adminView, когда на экране список обращений (а не одно из них).
export const ADMIN_LIST_VIEW = 'list'

interface SupportChatState {
  // Пришёл ответ поддержки (администратору — новое обращение), а чат не
  // открыт — точка на вкладке «Сообщения» и в строке поддержки, как на сайте.
  hasUnread: boolean
  // Чат поддержки сейчас на экране: пришедшее сообщение сразу прочитано.
  isChatOpen: boolean
  // Что видит администратор: ADMIN_LIST_VIEW, id открытого обращения или
  // null, если инбокса нет на экране.
  adminView: string | null
  setHasUnread: (hasUnread: boolean) => void
  setChatOpen: (isChatOpen: boolean) => void
  setAdminView: (view: string) => void
  // Экран уходит с глаз. Сбрасываем, только если вид всё ещё его: при
  // переходе список → обращение новый экран мог занять место раньше, чем
  // старый успел отписаться.
  leaveAdminView: (view: string) => void
}

export const useSupportChatStore = create<SupportChatState>()(set => ({
  hasUnread: false,
  isChatOpen: false,
  adminView: null,
  setHasUnread: hasUnread => set({ hasUnread }),
  setChatOpen: isChatOpen => set({ isChatOpen }),
  setAdminView: view => set({ adminView: view }),
  leaveAdminView: view => set(state => (state.adminView === view ? { adminView: null } : state))
}))
