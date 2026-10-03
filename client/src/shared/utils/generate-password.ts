// Генератор случайного пароля для админки — изначально жил только в
// CreateUserForm (создание продавцу аккаунта вручную), теперь переиспользуется
// и в SetPasswordDialog (принудительная смена пароля существующему
// пользователю), поэтому вынесен сюда как общая утилита. Буквы в обоих
// регистрах + цифры, без визуально похожих символов (0/O, 1/l/I) — чтобы
// администратору было легко продиктовать пароль по телефону или переписать
// от руки. Длина 10 — с запасом выше минимума в 6 символов (см.
// AdminCreateUserSchema/AdminSetPasswordSchema).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

export const generatePassword = () =>
  Array.from({ length: 10 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')
