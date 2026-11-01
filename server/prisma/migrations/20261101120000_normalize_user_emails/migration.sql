-- Почта пользователей хранится в одном виде: без пробелов по краям и в нижнем
-- регистре (см. normalizeEmail в server/src/libs/common/utils/email.util.ts).
-- Уникальность почты в Postgres учитывает регистр, поэтому до этой миграции
-- «Ivan@Mail.ru» и «ivan@mail.ru» могли оказаться двумя разными аккаунтами.

-- 1. Если такие пары уже есть, миграция останавливается ДО любых изменений:
--    объединять аккаунты автоматически нельзя, это решает владелец вручную.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "users"
    WHERE "email" IS NOT NULL
    GROUP BY lower(trim("email"))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Есть аккаунты с одинаковой почтой в разном регистре. Найти: SELECT lower(trim(email)), array_agg(id) FROM users WHERE email IS NOT NULL GROUP BY 1 HAVING count(*) > 1';
  END IF;
END $$;

-- 2. Приводим почту к единому виду (пользователи и ещё не использованные токены
--    подтверждения, сброса пароля и смены почты).
UPDATE "users" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));
UPDATE "tokens" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));

-- 3. База сама не даст записать почту в другом виде, даже если в коде
--    появится новый путь записи без нормализации. Вместе с существующим
--    уникальным индексом по email это даёт уникальность без учёта регистра.
--    Prisma не описывает CHECK в schema.prisma и не удаляет его при следующих
--    миграциях (как conversation_participant_check).
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase_check" CHECK ("email" = lower(trim("email")));
