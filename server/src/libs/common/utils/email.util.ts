// Почта хранится и сравнивается в одном виде: без пробелов по краям и в
// нижнем регистре. Иначе «Ivan@Mail.ru» и «ivan@mail.ru» для базы — два
// разных пользователя (уникальность в Postgres учитывает регистр), хотя
// письма приходят в один и тот же ящик. Ограничение в базе
// (users_email_lowercase_check) не даёт записать почту в другом виде.
export const normalizeEmail = (email: string): string => email.trim().toLowerCase()
