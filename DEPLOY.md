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
   - Подтверждение номера звонком (`server/.env`): основной провайдер —
     sms.ru (`SMSRU_API_ID`, ключ из личного кабинета sms.ru), «Звонок»
     (`ZVONOK_*`) остаётся запасным. Пока `SMSRU_API_ID` не задан, всё
     работает на «Звонке», как раньше. `PHONE_CONFIRM_PROVIDER=smsru` или
     `zvonok` принудительно выбирает основного провайдера (например, чтобы
     быстро вернуться на «Звонок»). Если sms.ru не отвечает, а номер
     российский, регистрация автоматически идёт через «Звонок»; для
     иностранных номеров запасного нет. После смены переменных
     `docker compose ... up -d server`.
   - Страны номеров. По умолчанию подтверждение звонком принимает номера
     любых стран (корректных по длине и коду). Звонок из-за границы у
     части операторов не засчитывается (так сказали в sms.ru) — пользователь
     в этом случае не получит подтверждения. Если понадобится ограничить
     список, задай `PHONE_ALLOWED_COUNTRIES=RU,BY,KZ` (двухбуквенные коды ISO
     через запятую): номер из другой страны сервер отклонит с сообщением
     «Подтверждение номеров этой страны пока недоступно» и не обратится к
     sms.ru. После смены `docker compose ... up -d server`.
   - Остальное (S3, почта, OAuth-ключи, ЮKassa, DaData, GigaChat) — как
     было, эти сервисы внешние и от переезда не зависят.
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

## 6.6. Бэкапы базы данных и обслуживание диска

Настроено 05.10.2026. До этого автоматических бэкапов не было — только
ручной `pg_dump` перед рискованными операциями.

### Что и куда копируется

- **Когда:** каждый день в 03:30 по времени сервера (UTC, это 06:30 МСК),
  cron root: `30 3 * * * /root/backup-db.sh >> /root/backups/backup.log 2>&1`.
- **Что:** вся база Postgres (`pg_dump` из контейнера `postgres`), архив
  `agrozone-ГГГГ-ММ-ДД_ЧЧММ.sql.gz` (сейчас ~100 МБ; текстовый SQL в
  несколько раз больше — основной объём это `category_terms`).
- **Куда:**
  1. на сервер, `/root/backups/` (папка `chmod 700`) — хранятся 14 дней;
  2. в Selectel S3, приватный бакет `agrozone-backups`, папка `db/` —
     хранятся 30 дней, старше скрипт удаляет сам. Стоимость ~8–10 ₽/мес.
- **Доступ к бакету:** политика доступа бакета, правило `backups-readwrite`
  (набор «Редактор») для сервисного пользователя `agrozone-server-s3` —
  тех же S3-ключей, что у приложения (`S3_ACCESS_KEY` / `S3_SECRET_KEY`
  из `server/.env`). Чтобы видеть файлы в панели Selectel, в это же
  правило нужно добавить и свою учётную запись владельца, иначе панель
  покажет «Доступ запрещён» (сама загрузка при этом работает).
- Версионирование и Object Lock на бакете выключены намеренно: иначе
  ротация не освобождала бы место.

Скрипт `/root/backup-db.sh` лежит только на сервере (в репозитории его
нет), поэтому его текст сохранён ниже — на случай переезда на новый сервер:

```bash
#!/bin/bash
set -euo pipefail
DIR=/root/backups
ENVF=/root/agro-zone/server/.env
BUCKET=agrozone-backups
REMOTE_KEEP_DAYS=30
OUT="$DIR/agrozone-$(date +%F_%H%M).sql.gz"

# 1. Локальный дамп
docker exec postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip > "$OUT.tmp"
gzip -t "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
find "$DIR" -name 'agrozone-*.sql.gz' -mtime +14 -delete
echo "$(date -Is) OK local $OUT $(du -h "$OUT" | cut -f1)"

# 2. Выгрузка в Selectel (ключи берём из .env приложения)
envval() { grep -E "^$1=" "$ENVF" | head -1 | cut -d= -f2- | tr -d '\r' | sed -E "s/^['\"]//; s/['\"]$//"; }
export AWS_ACCESS_KEY_ID="$(envval S3_ACCESS_KEY)"
export AWS_SECRET_ACCESS_KEY="$(envval S3_SECRET_KEY)"
REGION="$(envval S3_REGION)"
export AWS_DEFAULT_REGION="${REGION:-ru-6}"
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
EP="$(envval S3_ENDPOINT)"

s3() {
  docker run --rm -e AWS_CA_BUNDLE=/ca.pem -v /root/ca-bundle.pem:/ca.pem:ro \
    -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION \
    -e AWS_REQUEST_CHECKSUM_CALCULATION -e AWS_RESPONSE_CHECKSUM_VALIDATION \
    -v "$DIR":/b:ro amazon/aws-cli --endpoint-url "$EP" s3 "$@" < /dev/null
}

NAME="$(basename "$OUT")"
if s3 cp "/b/$NAME" "s3://$BUCKET/db/$NAME" --only-show-errors; then
  echo "$(date -Is) OK remote s3://$BUCKET/db/$NAME"
else
  echo "$(date -Is) ERROR: upload to Selectel failed" >&2
  exit 1
fi

# 3. Чистка старых копий в бакете
CUT="$(date -d "$REMOTE_KEEP_DAYS days ago" +%F)"
FILES="$(s3 ls "s3://$BUCKET/db/" | awk '{print $4}' | grep -E '^agrozone-[0-9]{4}-[0-9]{2}-[0-9]{2}_' || true)"
for f in $FILES; do
  d="${f:9:10}"
  if [[ "$d" < "$CUT" ]]; then
    s3 rm "s3://$BUCKET/db/$f" --only-show-errors
    echo "$(date -Is) removed old remote $f"
  fi
done
```

Нюанс с TLS: S3-эндпоинт Selectel отдаёт сертификат с российским корневым
центром, которого нет в образе `amazon/aws-cli` (ошибка
`CERTIFICATE_VERIFY_FAILED ... self-signed certificate in certificate
chain`). Поэтому скрипт монтирует в контейнер набор доверенных
сертификатов сервера плюс корневой сертификат из репозитория. Если на
новом сервере файла нет — создать:

```bash
cat /etc/ssl/certs/ca-certificates.crt /root/agro-zone/server/certs/russian_trusted_root_ca.pem > /root/ca-bundle.pem
```

Установка на новом сервере: положить скрипт в `/root/backup-db.sh`,
`chmod 700`, создать `/root/backups` (`chmod 700`), создать
`/root/ca-bundle.pem` (команда выше), добавить cron-строку из начала
раздела и один раз запустить скрипт вручную — в конце должно быть
`OK local …` и `OK remote …`.

### Как убедиться, что бэкап работает

```bash
tail -5 /root/backups/backup.log   # свежие строки OK local / OK remote
ls -lh /root/backups               # архивы за последние дни, ~100 МБ каждый
```

Ошибки пишутся в тот же лог, уведомлений на почту/в мессенджер нет —
поэтому заглядывать в лог стоит раз в пару недель. Внеочередной бэкап
(например, перед рискованной миграцией): `/root/backup-db.sh`.

### Восстановление из архива

Проверено 05.10.2026: архив развёрнут в пустую временную базу
(`postgres:15.2`) без единой ошибки, число записей в таблицах совпало с
боевой базой. Откат на самой боевой базе не репетировали — делайте его
осознанно и только по шагам ниже.

1. Взять архив. Свежий лежит на сервере в `/root/backups/`. Если сервера
   нет или диск потерян — скачать из панели Selectel: бакет
   `agrozone-backups` → папка `db` → нужный файл.
2. Остановить API, чтобы никто не писал в базу во время восстановления:

   ```bash
   cd ~/agro-zone
   docker compose -f docker-compose.prod.yml --env-file .env stop server
   ```
3. Сделать страховочную копию текущего состояния (даже если оно
   «сломано») — `/root/backup-db.sh`.
4. Пересоздать пустую базу и залить архив (`U`/`DB` — логин и имя базы
   из контейнера `postgres`):

   ```bash
   U=$(docker exec postgres printenv POSTGRES_USER); DB=$(docker exec postgres printenv POSTGRES_DB)
   docker exec postgres psql -U "$U" -d postgres -c "DROP DATABASE \"$DB\" WITH (FORCE);" -c "CREATE DATABASE \"$DB\";"
   gunzip -c /root/backups/agrozone-ГГГГ-ММ-ДД_ЧЧММ.sql.gz | docker exec -i postgres psql -U "$U" -d "$DB" -q
   ```
5. Запустить API и проверить сайт:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env up -d server
   ```

Таблица `_prisma_migrations` восстанавливается вместе с остальным, так
что `prisma migrate deploy` после этого ничего лишнего не применит.

Переезд на новый сервер: поднять `db` по разделам 2–4, остановить
`server`, выполнить шаг 4 (без DROP, если база пустая), затем запустить
остальное.

### Что бэкапом НЕ покрыто

- **Файл `.env` и секреты** (`.env`, `server/.env`, ключи) — в репозитории
  их нет, в бэкап базы они не попадают. Храните копию в менеджере
  паролей или другом защищённом месте: без них новый сервер не поднять.
- **Фото объявлений** лежат в бакете `agrozone-media` без отдельной копии
  и без версионирования. Если файлы удалить случайно, вернуть их нечем.
  При желании можно включить версионирование на этом бакете.
- **Сертификаты Let's Encrypt** — выпускаются заново по разделу 5.

### Диск: кэш сборки Docker

05.10.2026 диск был заполнен на 85 %: кэш сборки Docker (BuildKit) занимал
57 ГБ, потому что копится при каждом деплое и сам не чистится. Очистили
вручную (`docker builder prune -af`), освободилось 55 ГБ. Чтобы не
повторилось, в cron добавлена еженедельная чистка — по воскресеньям в
04:00 остаётся не более 8 ГБ самого свежего кэша:

```bash
0 4 * * 0 docker builder prune -af --keep-storage 8GB >> /root/backups/prune.log 2>&1
```

Не запускайте `docker volume prune` и `docker system prune --volumes`:
они могут удалить том `postgres_data` с боевой базой, если контейнер в
этот момент остановлен.

Состояние диска: `df -h /`; что занимает место в Docker: `docker system df`.

Баланс Selectel: если он закончится, сервер и хранилище могут быть
остановлены. Включите уведомления о низком балансе / автоплатёж в
разделе «Биллинг».

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
