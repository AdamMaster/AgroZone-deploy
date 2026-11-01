-- Лента каталога «сначала свежие» сортируется по COALESCE(bumped_at, created_at).
-- Индекса под это выражение не было: с ростом каталога каждый запрос ленты
-- сортировал бы все опубликованные объявления целиком. Индекс по выражению
-- в schema.prisma не описать (Prisma удалила бы его при следующей
-- миграции), поэтому значение хранится в отдельной колонке sort_at, которую
-- поддерживает триггер, а индекс по ней описан в schema.prisma как обычный.

-- 1. Колонка и её значения для уже существующих объявлений.
ALTER TABLE "ads" ADD COLUMN "sort_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "ads" SET "sort_at" = COALESCE("bumped_at", "created_at");

-- 2. Триггер: при создании объявления и любой записи bumped_at/created_at
--    (поднятие, автоподнятие, услуги, премиум, воркеры через updateMany)
--    sort_at пересчитывается сам. Прямая запись в sort_at тоже
--    перезаписывается — значение всегда равно COALESCE(bumped_at, created_at).
CREATE OR REPLACE FUNCTION ads_set_sort_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.sort_at := COALESCE(NEW.bumped_at, NEW.created_at);
  RETURN NEW;
END;
$$;

CREATE TRIGGER ads_set_sort_at
BEFORE INSERT OR UPDATE OF bumped_at, created_at, sort_at ON "ads"
FOR EACH ROW EXECUTE FUNCTION ads_set_sort_at();

-- 3. Индекс под ленту: status = PUBLISHED, сортировка sort_at DESC, id DESC.
CREATE INDEX "ads_status_sort_at_id_idx" ON "ads"("status", "sort_at" DESC, "id" DESC);

-- 4. Индекс для поиска по названию: был создан в 20260628134746_add_trgm_gin_indexes
--    и удалён сгенерированной миграцией 20260628183128_add_ad_slug. Теперь он
--    описан в schema.prisma и больше не пропадёт.
CREATE INDEX IF NOT EXISTS "ads_title_trgm" ON "ads" USING GIN ("title" gin_trgm_ops);
