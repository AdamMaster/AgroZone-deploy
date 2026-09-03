import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { UserRole } from '@/generated/prisma/enums'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { CurrentUser } from '@/auth/decorators/decorators/user.decorator'

import { FindMessagesQueryDto } from '@/conversations/dto/find-messages-query.dto'

import { CurrentSupportParticipant } from './decorators/support-participant.decorator'
import { SendSupportMessageDto } from './dto/send-support-message.dto'
import { SupportIdentityGuard } from './guards/support-identity.guard'
import { SupportService } from './support.service'
import { SupportParticipant } from './types/support-participant.type'

// Не больше 15 сообщений в минуту с одной IP/сессии — с запасом для живой
// переписки (в SupportChatWidget нет ничего похожего на бота, отправляющего
// пачками), но режет как минимум простой флуд-скрипт по анонимному
// эндпоинту. Отдельно от общего лимита ThrottlerModule (3/мин, см.
// app.module.ts) — тот рассчитан на чувствительныеauth-эндпоинты, тут же
// нужен лимит именно под чат.
const SEND_MESSAGE_THROTTLE = { default: { limit: 15, ttl: 60000 } }

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // --- Публичная часть: посетитель (юзер или гость) ---

  @Get('conversation')
  @UseGuards(SupportIdentityGuard)
  getMyConversation(@CurrentSupportParticipant() participant: SupportParticipant) {
    return this.supportService.getMyConversation(participant)
  }

  @Get('conversation/messages')
  @UseGuards(SupportIdentityGuard)
  getMyMessages(@CurrentSupportParticipant() participant: SupportParticipant, @Query() query: FindMessagesQueryDto) {
    return this.supportService.getMyMessages(participant, query)
  }

  @Post('conversation/messages')
  @UseGuards(SupportIdentityGuard, ThrottlerGuard)
  @Throttle(SEND_MESSAGE_THROTTLE)
  sendMyMessage(@CurrentSupportParticipant() participant: SupportParticipant, @Body() dto: SendSupportMessageDto) {
    return this.supportService.sendMyMessage(participant, dto.text)
  }

  @Patch('conversation/read')
  @UseGuards(SupportIdentityGuard)
  markMyConversationRead(@CurrentSupportParticipant() participant: SupportParticipant) {
    return this.supportService.markMyConversationRead(participant)
  }

  // --- Админская часть ---

  @Get('admin/conversations')
  @Authorization(UserRole.ADMIN)
  getAdminConversations() {
    return this.supportService.getAdminConversations()
  }

  @Get('admin/conversations/:id/messages')
  @Authorization(UserRole.ADMIN)
  getAdminMessages(@Param('id', ParseUUIDPipe) id: string, @Query() query: FindMessagesQueryDto) {
    return this.supportService.getAdminMessages(id, query)
  }

  @Post('admin/conversations/:id/messages')
  @Authorization(UserRole.ADMIN)
  sendAdminMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: SendSupportMessageDto
  ) {
    return this.supportService.sendAdminMessage(id, { id: adminId }, dto.text)
  }

  @Patch('admin/conversations/:id/read')
  @Authorization(UserRole.ADMIN)
  markAdminConversationRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.supportService.markAdminConversationRead(id)
  }

  // Модераторское удаление — см. SupportService.deleteMessage: любое
  // сообщение тикета, своё или собеседника, пропадает у обеих сторон.
  @Delete('admin/conversations/:id/messages/:messageId')
  @Authorization(UserRole.ADMIN)
  deleteMessage(@Param('id', ParseUUIDPipe) id: string, @Param('messageId', ParseUUIDPipe) messageId: string) {
    return this.supportService.deleteMessage(id, messageId)
  }

  // "Удалить всё" — весь тикет разом, см. SupportService.deleteAllMessages.
  // Отдельный маршрут (без :messageId), не конфликтует с удалением одного
  // сообщения — Nest матчит по количеству сегментов пути.
  @Delete('admin/conversations/:id/messages')
  @Authorization(UserRole.ADMIN)
  deleteAllMessages(@Param('id', ParseUUIDPipe) id: string) {
    return this.supportService.deleteAllMessages(id)
  }

  // "Удалить чат" в списке тикетов — уборка инбокса, не модерация (см.
  // SupportService.hideConversation): переписка участника не трогается,
  // тикет просто пропадает из списка админа и вернётся сам, если участник
  // напишет снова. Не конфликтует с deleteMessage/deleteAllMessages выше —
  // у тех в пути обязательно ещё :messageId или /messages, у этого маршрута
  // сегментов меньше.
  @Delete('admin/conversations/:id')
  @Authorization(UserRole.ADMIN)
  hideConversation(@Param('id', ParseUUIDPipe) id: string) {
    return this.supportService.hideConversation(id)
  }

  @Post('admin/guests/:guestId/block')
  @Authorization(UserRole.ADMIN)
  blockGuest(@Param('guestId', ParseUUIDPipe) guestId: string) {
    return this.supportService.blockGuest(guestId)
  }

  @Post('admin/guests/:guestId/unblock')
  @Authorization(UserRole.ADMIN)
  unblockGuest(@Param('guestId', ParseUUIDPipe) guestId: string) {
    return this.supportService.unblockGuest(guestId)
  }
}
