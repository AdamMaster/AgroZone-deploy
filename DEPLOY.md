# Деплой на Selectel — план

Стек: Next.js (client) + NestJS (server) + Postgres + Redis, всё через
Docker Compose на одной Cloud Server VM. Картинки объявлений уже во внешнем
S3-хранилище (Timeweb, `s3.twcstorage.ru`) — их никуда переносить не нужно.

## 0. Что уже поправлено в коде под этот перенос

- `client/next.config.ts` — добавлен `output: 'standalone'` (нужен для
  лёгкого прод-образа).
- `server/src/app.module.ts` — `BullModule.forRoot` брал Redis-хост
  захардкоженным `'localhost'`, работало только пока сервер и Redis были
  на одной машине без Docker. В контейнерах Redis — отдельный хост
  (`dredis`), с `localhost` фоновые задачи (бамп объявлений, архивация
  просрочки, статусы услуг) просто не подключились бы. Поправлено на
  `process.env.REDIS_HOST`/`REDIS_PORT` — так же, как уже сделано в
  остальных местах проекта.
- Добавлены: `server/Dockerfile`, `client/Dockerfile`, `.dockerignore` в
  обоих, `docker-compose.prod.yml`, `nginx/`, `.env.prod.example`.

## 1. Selectel: заказать сервер

Cloud Server, Ubuntu 22.04/24.04. По ресурсам не экономьте — на сервере
крутится не только API, а ещё и локальная ONNX-модель эмбеддингов
(семантический поиск категорий, греется в памяти самого Node-процесса при
старте, см. `embeddings.service.ts`) плюс Postgres и Redis рядом:

- Минимум: 2 vCPU / 4 GB RAM — заведётся, но впритык.
- Рекомендую: 4 vCPU / 8 GB RAM, NVMe/SSD от 40–60 GB — с запасом, не
  словите OOM на первом же всплеске трафика.

Домен: должен уже существовать и указывать A-записью на IP сервера —
`example.ru` → IP, `api.example.ru` → тот же IP (или CNAME на example.ru).
Без домена не будет HTTPS через Let's Encrypt, а без HTTPS не будут
нормально работать OAuth-редиректы (Google/Yandex) и вебхук ЮKassa.

## 2. Сервер: базовая подготовка

```bash
# Docker + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # перелогиниться после этого

# Клонировать репозиторий (или залить архивом/rsync — как удобнее)
git clone <ваш-репозиторий> agro-zone
cd agro-zone
```

## 3. Секреты и конфиги на сервере

Три файла с реальными значениями (ни один из них не должен попасть в git):

1. `.env` в корне (рядом с `docker-compose.prod.yml`) — на основе
   `.env.prod.example`: пароли Postgres/Redis + публичные ключи для
   сборки клиента (recaptcha/2GIS/DaData) + `CLIENT_SERVER_URL`.
2. `server/.env` — берёте текущий рабочий `.env` с dev-машины и правите:
   - `NODE_ENV=production`
   - `APPLICATION_URL=https://api.example.ru`
   - `ALLOWED_ORIGIN=https://example.ru`
   - `SESSION_DOMAIN=.example.ru` (с точкой — расшаривает куку между
     example.ru и api.example.ru)
   - `SESSION_SECURE=true`
   - `POSTGRES_HOST=db` (имя сервиса в docker-compose, не `localhost`)
   - `REDIS_HOST=dredis`
   - `POSTGRES_URI` / `REDIS_URI` — пересобрать под новые host/пароли из
     `.env` (п.1)
   - Остальное (S3, почта, OAuth-ключи, ЮKassa, DaData, Zvonok, GigaChat)
     — как было, эти сервисы внешние и от переезда не зависят.
3. Домены в `nginx/bootstrap/app.conf` и `nginx/conf.d/app.conf` —
   заменить `example.ru`/`api.example.ru` на реальный домен (сейчас там
   плейсхолдер).

## 4. Первый запуск: собрать и поднять БД/Redis/API/фронт

```bash
docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env up -d db dredis server client
```

Прогнать миграции (один раз, и потом при каждом релизе со новыми
миграциями):

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec server npx prisma migrate deploy
```

Проверить логи — Redis/Postgres должны подключиться, ONNX-модель
эмбеддингов должна прогреться без ошибок (первый старт качает модель с
HuggingFace Hub, может занять минуту-другую):

```bash
docker compose -f docker-compose.prod.yml --env-file .env logs -f server
```

## 5. HTTPS: сначала bootstrap-конфиг, потом сертификат, потом боевой конфиг

Nginx не может выпустить сертификат конфигом, который сам этот
сертификат уже требует — курица и яйцо. Поэтому по шагам:

```bash
# 5.1 — временно поднимаем nginx с bootstrap-конфигом (только HTTP,
# отдаёт ACME challenge)
cp nginx/bootstrap/app.conf nginx/conf.d/app.conf.tmp
mv nginx/conf.d/app.conf nginx/conf.d/app.conf.bak
mv nginx/conf.d/app.conf.tmp nginx/conf.d/app.conf
docker compose -f docker-compose.prod.yml --env-file .env up -d nginx

# 5.2 — выпускаем сертификат на все три домена сразу (webroot-метод,
# использует volume certbot_www, который уже смонтирован в nginx)
docker compose -f docker-compose.prod.yml --env-file .env run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d example.ru -d www.example.ru -d api.example.ru \
  --email you@example.ru --agree-tos --no-eff-email

# 5.3 — возвращаем боевой (HTTPS) конфиг и перечитываем nginx
mv nginx/conf.d/app.conf.bak nginx/conf.d/app.conf
docker compose -f docker-compose.prod.yml --env-file .env restart nginx
```

Продление сертификата (Let's Encrypt живёт 90 дней) — раз в 2–3 месяца
прогнать `certbot renew` тем же способом (п.5.2, без `certonly`, просто
`renew`) и `restart nginx`. Можно сразу поставить в cron на хосте, чтобы
не забыть:

```bash
# crontab -e
0 3 1 * * cd /path/to/agro-zone && docker compose -f docker-compose.prod.yml --env-file .env run --rm certbot renew --quiet && docker compose -f docker-compose.prod.yml --env-file .env restart nginx
```

## 6. Проверка

- `https://example.ru` открывается, картинки объявлений грузятся с
  `s3.twcstorage.ru`.
- Логин через Google/Yandex — редиректы должны идти уже на `https://`.
- Загрузка фото объявления (проверяет и `client_max_body_size` в nginx, и
  сам S3-аплоад).
- Семантический поиск категорий (проверяет, что embeddings-модель
  реально прогрелась и работает не только на dev-машине).
- Оплата продвижения объявления (ЮKassa) — вебхук должен достучаться до
  `https://api.example.ru/...`, а не до `localhost` (см. комментарии в
  `ad-bumps.controller.ts` — вы уже знали про это ограничение).

## 7. На будущее (не сегодня, но держите в уме)

- BullMQ сейчас гоняется в том же процессе, что и API (нет отдельного
  worker-контейнера) — для текущей нагрузки нормально, разделять пока
  незачем.
- Кэш ONNX-модели — в named volume (`embeddings_cache`), переживает
  `docker compose up --build`. Если когда-нибудь будете пересоздавать сам
  volume — учтите, что первый запрос после этого снова полезет качать
  модель с HuggingFace Hub.
- Автопродление сертификата — cron-строка выше решает вопрос, но раз в
  полгода стоит вручную проверить, что она действительно отработала
  (`docker compose ... run --rm certbot certificates`).
