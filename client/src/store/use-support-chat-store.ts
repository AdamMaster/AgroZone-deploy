import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SupportChatStore {
  isOpen: boolean
  // Гость хоть раз открывал виджет в этом браузере — единственное, что тут
  // персистится (см. partialize ниже). Пока это false, сокет и REST к
  // /support/* сознательно не трогаются вообще: любой запрос под
  // SupportIdentityGuard заводит анонимному гостю запись в базе и cookie
  // сессии (см. SupportGuestsService.getOrCreateForSession на бэкенде), а
  // просто зашедший на сайт человек, ни разу не открывший чат, не должен
  // обзаводиться гостевой identity молча в фоне. Для залогиненных
  // (юзер/админ) это ограничение не действует — см. SupportChatWidget: там
  // сессия уже есть, заводить нечего.
  hasEngaged: boolean
  // Какой тикет открыт в админском инбоксе — null значит "список", не null —
  // конкретный тред (см. SupportAdminInbox). У обычного участника своего
  // значения нет, тикет всегда ровно один.
  activeAdminConversationId: string | null

  onOpen: () => void
  onClose: () => void
  onToggle: () => void
  setActiveAdminConversationId: (id: string | null) => void
}

export const useSupportChatStore = create<SupportChatStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      hasEngaged: false,
      activeAdminConversationId: null,

      onOpen: () => set({ isOpen: true, hasEngaged: true }),
      onClose: () => set({ isOpen: false }),
      onToggle: () => (get().isOpen ? set({ isOpen: false }) : set({ isOpen: true, hasEngaged: true })),
      setActiveAdminConversationId: id => set({ activeAdminConversationId: id })
    }),
    {
      name: 'support-chat',
      // isOpen/activeAdminConversationId — чисто сиюминутное состояние UI,
      // персистить их значило бы открывать чат сразу на новой вкладке или
      // помнить чужой выбранный тикет между сессиями браузера админа.
      partialize: state => ({ hasEngaged: state.hasEngaged })
    }
  )
)
