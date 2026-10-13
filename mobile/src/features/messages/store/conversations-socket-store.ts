import { create } from 'zustand'

interface ConversationsSocketState {
  // Сокет диалогов по объявлениям подключён: новые сообщения приходят сами,
  // опрашивать список и открытый диалог не нужно. Не подключён (старый
  // сервер, плохая сеть) — работает прежний опрос.
  isConnected: boolean
  setConnected: (isConnected: boolean) => void
}

export const useConversationsSocketStore = create<ConversationsSocketState>()(set => ({
  isConnected: false,
  setConnected: isConnected => set({ isConnected })
}))
