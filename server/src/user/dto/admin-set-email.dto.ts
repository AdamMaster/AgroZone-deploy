import { IsEmail } from 'class-validator'

// Задать/сменить email пользователю из админки (/admin/users/:id, см.
// UserController.setEmailByAdmin/UserService.setEmailByAdmin). Нужен
// отдельно от auth/email-change (самостоятельная смена email пользователем)
// — там обязательны текущий пароль и подтверждение владения новым адресом
// по ссылке из письма (см. EmailChangeService.requestEmailChange). Здесь же
// частый случай — у пользователя ПОСЛЕ РЕГИСТРАЦИИ email вообще нет (вход
// только по телефону), и самостоятельно это обычным путём не изменить. Как
// и со сменой пароля — админ действует без обычных проверок, это и есть
// назначение функции.
export class AdminSetEmailDto {
  @IsEmail({}, { message: 'Введите корректный адрес электронной почты' })
  newEmail!: string
}
