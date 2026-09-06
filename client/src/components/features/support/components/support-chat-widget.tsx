'use client'

import { useSupportChatStore } from '@/store'
import { useEffect } from 'react'

import { UserRole } from '@/components/features/auth/types'

import { useProfile } from '@/shared/hooks'

import { useSupportMyConversation, useSupportRealtime } from '../hooks'
import { SupportAdminInbox } from './support-admin-inbox'
import { SupportChatButton } from './support-chat-button'
import { SupportChatPanel } from './support-chat-panel'
import { SupportParticipantChat } from './support-participant-chat'

// Смонтирован в корневом layout (см. app/layout.tsx) — один на всё
// приложение, живёт всегда, даже когда сама панель закрыта. Это важно для
// двух вещей: (1) бейдж непрочитанного на закрытой кнопке — если бы сокет
// подключался только вместе с открытой панелью, узнать о новом сообщении,
// пока чат закрыт, было бы неоткуда; (2) ровно одно сокет-соединение на
// вкладку — не по одному на каждое открытие/закрытие панели.
export const SupportChatWidget = () => {
  const { user } = useProfile()
  const { isOpen, hasEngaged, activeAdminConversationId, onClose, onToggle, setActiveAdminConversationId } =
    useSupportChatStore()

  const isAdmin = user?.role === UserRole.Admin

  // Залогиненным (юзер или админ) сокет можно открывать сразу — сессия уже
  // есть, никакой гостевой identity заводить не придётся (см.
  // SupportIdentityService.resolveForHandshake на бэкенде).
  //
  // Анонимному гостю одного hasEngaged недостаточно: это флаг "виджет хоть
  // раз открывали", а не "identity уже есть". Сразу после первого открытия
  // ни SupportGuest в базе, ни supportGuestId в cookie сессии ещё нет —
  // они появляются только как побочный эффект первого REST-запроса под
  // SupportIdentityGuard. Если подключать сокет одновременно с этим
  // запросом (а не ПОСЛЕ него), возможна гонка: хэндшейк socket.io уйдёт
  // раньше, чем браузер применит Set-Cookie из ответа, тогда
  // SupportIdentityService.resolveForHandshake ничего не найдёт,
  // SupportGateway ответит NOT_INITIALIZED и форсированно отключит сокет
  // (см. handleConnection) — а после server-initiated disconnect
  // socket.io-client сам не переподключается, так что гость молча
  // остаётся без живых обновлений до перезагрузки страницы. Поэтому для
  // гостя ждём isReady — успешного завершения этого REST-запроса (тот же
  // queryKey, что и в SupportParticipantChat, TanStack Query дедуплицирует
  // сетевой вызов) — и только потом включаем сокет.
  const { isReady: isGuestIdentityReady } = useSupportMyConversation(!user && hasEngaged)

  const socketEnabled = !!user || isGuestIdentityReady

  const { hasUnread, clearUnread } = useSupportRealtime({
    isAdmin,
    enabled: socketEnabled,
    isPanelOpen: isOpen,
    activeAdminConversationId
  })

  useEffect(() => {
    if (isOpen) clearUnread()
  }, [isOpen, clearUnread])

  const handleClose = () => {
    onClose()
    if (isAdmin) setActiveAdminConversationId(null)
  }

  return (
    <>
      <SupportChatButton isOpen={isOpen} hasUnread={hasUnread} onClick={onToggle} />

      {isOpen && (
        <SupportChatPanel onClose={handleClose}>
          {isAdmin ? <SupportAdminInbox /> : <SupportParticipantChat />}
        </SupportChatPanel>
      )}
    </>
  )
}
