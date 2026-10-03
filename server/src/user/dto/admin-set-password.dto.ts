import { IsString, MinLength } from 'class-validator'

// Принудительная смена пароля пользователю из админки (/admin/users/:id,
// см. UserController.setPasswordByAdmin/UserService.setPasswordByAdmin).
// В отличие от PasswordChangeDto (самостоятельная смена пароля самим
// пользователем) — тут нет currentPassword: админ меняет пароль ИМЕННО
// потому, что обычный путь (знать текущий пароль) недоступен — пользователь
// потерял доступ, забыл пароль и т.п. Та же валидация минимальной длины,
// что и везде в проекте (PasswordChangeDto, AdminCreateUserSchema на
// фронте) — не вводим отдельную, более строгую политику специально для
// этого эндпоинта.
export class AdminSetPasswordDto {
  @IsString()
  @MinLength(6, { message: 'Пароль минимум 6 символов' })
  newPassword!: string
}
