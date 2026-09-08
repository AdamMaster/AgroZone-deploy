import pathlib

def replace_once(s, old, new, label):
    n = s.count(old)
    assert n == 1, f"{label}: expected exactly 1 occurrence, got {n}"
    return s.replace(old, new)

# 1. conversations.service.ts — fix error typing + prettier wrap
p = pathlib.Path("server/src/conversations/conversations.service.ts")
s = p.read_text(encoding="utf-8")

s = replace_once(
    s,
    "this.logger.error(`Не удалось отправить уведомление о новом сообщении: ${error}`)",
    "this.logger.error(`Не удалось отправить уведомление о новом сообщении: ${(error as Error).message}`)",
    "conversations.service.ts error typing"
)

s = replace_once(
    s,
    "    return this.createMessage(conversationId, userId, dto.text, counterpartId, conversation.adTitleSnapshot ?? '', dto.attachments)",
    "    return this.createMessage(\n      conversationId,\n      userId,\n      dto.text,\n      counterpartId,\n      conversation.adTitleSnapshot ?? '',\n      dto.attachments\n    )",
    "conversations.service.ts prettier wrap"
)

p.write_text(s, encoding="utf-8")

# 2. mail.service.ts — prettier wrap of sendNewMessageEmail signature
p2 = pathlib.Path("server/src/libs/mail/mail.service.ts")
s2 = p2.read_text(encoding="utf-8")

s2 = replace_once(
    s2,
    "async sendNewMessageEmail(email: string, conversationId: string, adTitle: string, senderName: string, messageText: string",
    "async sendNewMessageEmail(\n    email: string,\n    conversationId: string,\n    adTitle: string,\n    senderName: string,\n    messageText: string",
    "mail.service.ts prettier wrap"
)

p2.write_text(s2, encoding="utf-8")

# 3. new-message.template.tsx — prettier wrap of props destructure
p3 = pathlib.Path("server/src/libs/mail/templates/new-message.template.tsx")
s3 = p3.read_text(encoding="utf-8")

s3 = replace_once(
    s3,
    "{ domain, conversationId, adTitle, senderName, messageText }",
    "{\n  domain,\n  conversationId,\n  adTitle,\n  senderName,\n  messageText\n}",
    "new-message.template.tsx prettier wrap"
)

p3.write_text(s3, encoding="utf-8")

# 4. notifications.service.ts — prettier wrap of notifyNewMessage signature
p4 = pathlib.Path("server/src/notifications/notifications.service.ts")
s4 = p4.read_text(encoding="utf-8")

s4 = replace_once(
    s4,
    "async notifyNewMessage(recipientId: string, conversationId: string, adTitle: string, senderName: string, messageText: string",
    "async notifyNewMessage(\n    recipientId: string,\n    conversationId: string,\n    adTitle: string,\n    senderName: string,\n    messageText: string",
    "notifications.service.ts prettier wrap"
)

p4.write_text(s4, encoding="utf-8")

print("OK")
