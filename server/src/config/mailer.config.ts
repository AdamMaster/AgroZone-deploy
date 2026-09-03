import { MailerOptions } from '@nestjs-modules/mailer'
import { ConfigService } from '@nestjs/config'

export const getMailerConfig = async (configService: ConfigService): Promise<MailerOptions> => ({
  transport: {
    host: configService.getOrThrow<string>('MAIL_HOST'),
    port: configService.getOrThrow<number>('MAIL_PORT'),
    // secure должен зависеть от порта, а не от окружения:
    // 465 -> implicit TLS (secure: true), 587/25 -> STARTTLS (secure: false)
    secure: Number(configService.getOrThrow<number>('MAIL_PORT')) === 465,
    auth: {
      user: configService.getOrThrow<string>('MAIL_LOGIN'),
      pass: configService.getOrThrow<string>('MAIL_PASSWORD')
    }
  },
  defaults: {
    // Без угловых скобок это не "имя + адрес" по RFC 5322, а один
    // синтаксически кривой адрес ("AgroZone lampezhev86@gmail.com" без
    // <>) — nodemailer/addressparser такое разбирает ненадёжно (не всегда
    // ошибкой, но и не гарантированно как валидный from), из-за чего
    // конкретное письмо может как уйти, так и молча не дойти в
    // зависимости от того, как его принял SMTP-сервер на том конце.
    from: `"AgroZone" <${configService.getOrThrow<string>('MAIL_LOGIN')}>`
  }
})
