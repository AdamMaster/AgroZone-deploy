-- Умный поиск по объявлениям (AdsService.findAll, search-условие) теперь
-- фильтрует/ранжирует и по ads.description через pg_trgm (similarity,
-- word_similarity), а не только по ads.title, как раньше. Без индекса
-- такие операторы по description скатились бы в последовательное
-- сканирование всей таблицы ads при каждом поиске — здесь тот же паттерн,
-- что и в 20260628134746_add_trgm_gin_indexes (ads_title_trgm).
CREATE INDEX IF NOT EXISTS ads_description_trgm
ON ads USING GIN (description gin_trgm_ops);
