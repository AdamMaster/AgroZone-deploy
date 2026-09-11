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
`agro-zone.ru` → IP, `api.agro-zone.ru` → тот же IP (или CNAME на
agro-zone.ru). Домен agro-zone.ru уже куплен и развёрнут (см. ROADMAP.md,
раздел S2) — ниже везде подставлен именно он вместо общего плейсхолдера.
Без домена не будет HTTPS через Let's Encrypt, а без HTTPS не будут
нормально работать OAuth-редиректы (Google/Yandex) и вебхук ЮKassa.

## 2. Сервер: базовая подготовка

```bash
# Docker + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # перелогиниться после этого

# Клонировать репозиторий. Раньше client/server были отдельными
# сабмодулями (см. историю ниже, в п.6.5), но в текущем состоянии
# репозитория (AgroZone-deploy) это уже обычный монорепозиторий —
# .gitmodules нет, client/ и server/ — простые папки, --recurse-submodules
# ничего не подтягивает и не нужен.
git clone <ваш-репозиторий> agro-zone
cd agro-zone
```

## 3. Секреты и конфиги на сервере

Три файла с реальными значениями (ни один из них не должен попасть в git):

1. `.env` в корне (рядом с `docker-compose.prod.yml`) — на основе
   `.env.prod.example`: пароли Postgres/Redis + публичные ключи для
   сборки клиента (recaptcha/2GIS/DaData) + `CLIENT_SERVER_URL`.
   Сюда же, когда будете подтверждать сайт в Яндекс.Вебмастере и Google
   Search Console (S2 в ROADMAP.md, домен agro-zone.ru уже развёрнут) —
   `GOOGLE_SITE_VERIFICATION` и `YANDEX_SITE_VERIFICATION`: код выдаётся
   в соответствующей панели при добавлении сайта, без него метатег
   подтверждения просто не рендерится (см. `app/layout.tsx`), ошибки не
   будет. После добавления значений — пересобрать и передеплоить клиент,
   затем нажать «Подтвердить» в панели.
   Туда же — `NEXT_PUBLIC_YANDEX_METRIKA_ID` (F15 в ROADMAP.md, счётчик +
   Вебвизор + 5 целей). Завести счётчик самостоятельно на
   metrika.yandex.ru (я не логинюсь в чужие аккаунты Яндекс/Google, см.
   правила): добавить сайт (agro-zone.ru, https), скопировать номер
   счётчика. Затем:
   1. В корневой `.env` — `NEXT_PUBLIC_YANDEX_METRIKA_ID=<номер счётчика>`.
   2. Пересобрать и передеплоить клиент (это NEXT_PUBLIC_-ключ — как и
      остальные три выше, нужен только на этапе сборки, см.
      `client/Dockerfile`): `docker compose -f docker-compose.prod.yml
      --env-file .env build client && docker compose -f
      docker-compose.prod.yml --env-file .env up -d client`.
   3. В панели Метрики: Настройки счётчика → Цели → добавить 5 целей типа
      «JavaScript-событие» с идентификаторами ровно `search`,
      `phone_reveal`, `message_to_seller`, `ad_submit`, `registration`
      (см. `client/src/shared/utils/metrika.ts`, `METRIKA_GOALS`) — без
      этого шага события всё равно будут долетать до Метрики, но не
      попадут в отчёты по конверсиям как цели.
   Без этой переменной счётчик просто не подключается — ошибок сборки и
   рантайма нет (см. `YandexMetrika`, `components/layout/analytics`).
2. `server/.env` — берёте текущий рабочий `.env` с dev-машины и правите:
   - `NODE_ENV=production`
   - `APPLICATION_URL=https://api.agro-zone.ru`
   - `ALLOWED_ORIGIN=https://agro-zone.ru`
   - `SESSION_DOMAIN=.agro-zone.ru` (с точкой — расшаривает куку между
     agro-zone.ru и api.agro-zone.ru)
   - `SESSION_SECURE=true`
   - `POSTGRES_HOST=db` (имя сервиса в docker-compose, не `localhost`)
   - `REDIS_HOST=dredis`
   - `POSTGRES_URI` / `REDIS_URI` — пересобрать под новые host/пароли из
     `.env` (п.1)
   - Остальное (S3, почта, OAuth-ключи, ЮKassa, DaData, Zvonok, GigaChat)
     — как было, эти сервисы внешние и от переезда не зависят.
3. Домены в `nginx/bootstrap/app.conf` и `nginx/conf.d/app.conf` — уже
   заменены на agro-zone.ru/api.agro-zone.ru, дополнительно ничего
   делать не нужно.

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
  -d agro-zone.ru -d www.agro-zone.ru -d api.agro-zone.ru \
  --email support@agro-zone.ru --agree-tos --no-eff-email

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

- `https://agro-zone.ru` открывается, картинки объявлений грузятся с
  `s3.twcstorage.ru`.
- Логин через Google/Yandex — редиректы должны идти уже на `https://`.
- Загрузка фото объявления (проверяет и `client_max_body_size` в nginx, и
  сам S3-аплоад).
- Семантический поиск категорий (проверяет, что embeddings-модель
  реально прогрелась и работает не только на dev-машине).
- Оплата продвижения объявления (ЮKassa) — вебхук должен достучаться до
  `https://api.agro-zone.ru/...`, а не до `localhost` (см. комментарии в
  `ad-bumps.controller.ts` — вы уже знали про это ограничение).

## 6.5. Обновление после первого деплоя

**Было исторически:** репозиторий когда-то был монорепо с сабмодулями
(`client`, `server` — отдельные репозитории, тут только указатели на их
коммиты), и из-за этого обычные `git clone` / `git pull` не подтягивали
код сабмодулей — сервер мог неделями катить один и тот же старый коммит
client/server, даже если в самом монорепо виден новый коммит (ровно так
один раз и случилось: фикс Suspense/useSearchParams был закоммичен и
запушен в `client`, а монорепо продолжало указывать на коммит до фикса,
пока указатель явно не запушили).

**Сейчас — не так.** Проверил (сентябрь 2026): в текущем рабочем дереве
`.gitmodules` нет, `client/.git` и `server/.git` нет — это обычные папки
одного репозитория (`AgroZone-deploy`), `git status` в корне показывает
изменённые файлы внутри `client/`/`server/` напрямую, а не единую
строку-указатель на чужой коммит, как было бы с сабмодулем. То есть
проблема выше, скорее всего, была устранена, когда сабмодули
расформировали и влили в монорепо — но раз документация про неё молчала,
на всякий случай выполните `git submodule status` на сервере один раз:
если команда ответит "No submodules" — раздел ниже не нужен, обычный
`git pull` подтягивает всё сразу.

**Каждый следующий релиз:**

```bash
cd agro-zone
git pull

docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

Если `git submodule status` всё же покажет что-то (значит где-то на
сервере сабмодули не до конца расформированы) — тогда дополнительно
`git submodule update --init --recursive` перед сборкой, и стоит
разобраться, почему на сервере состояние отличается от того, что видно
в этой рабочей копии.

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
