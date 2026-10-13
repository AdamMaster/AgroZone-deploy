import { create } from 'zustand'

interface ConversationsSocketStore {
  // Сокет диалогов по объявлениям подключён: новые сообщения приходят сами,
  // список и открытый диалог опрашивать не нужно. Не подключён (сервер без
  // сокета, обрыв) — работает прежний поллинг.
  isConnected: boolean
  setConnected: (isConnected: boolean) => void
}

export const useConversationsSocketStore = create<ConversationsSocketStore>(set => ({
  isConnected: false,
  setConnected: isConnected => set({ isConnected })
}))
