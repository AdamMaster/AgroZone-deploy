import { create } from 'zustand'

interface SupportChatState {
  // Пришёл ответ поддержки, а чат не открыт — точка на вкладке «Сообщения»
  // и в строке «Поддержка AgroZone», как на сайте.
  hasUnread: boolean
  // Чат поддержки сейчас на экране: пришедшее сообщение сразу прочитано.
  isChatOpen: boolean
  setHasUnread: (hasUnread: boolean) => void
  setChatOpen: (isChatOpen: boolean) => void
}

export const useSupportChatStore = create<SupportChatState>()(set => ({
  hasUnread: false,
  isChatOpen: false,
  setHasUnread: hasUnread => set({ hasUnread }),
  setChatOpen: isChatOpen => set({ isChatOpen })
}))
