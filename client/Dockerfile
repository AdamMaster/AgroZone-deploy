# Next.js фронт — прод-образ, standalone-сборка (см. next.config.ts:
# output: 'standalone').
#
# Важный нюанс: NEXT_PUBLIC_*-переменные и всё, что прокинуто через
# next.config.ts -> env (SERVER_URL, YANDEX_CAPTCHA_CLIENT_KEY) —
# запекаются в клиентский бандл ВО ВРЕМЯ `next build`, а не читаются в
# рантейме контейнера. Поэтому их нужно передать как build-time ARG'и (см.
# docker-compose.prod.yml: build.args), а не просто положить в .env рядом
# с контейнером — иначе сайт соберётся, но капча/карты тихо не заработают,
# и это не сразу очевидно, откуда растут ноги.
FROM node:20-bookworm-slim AS build
WORKDIR /app

ARG SERVER_URL
ARG NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY
ARG NEXT_PUBLIC_2GIS_KEY
ARG NEXT_PUBLIC_DADATA_KEY
# GOOGLE_SITE_VERIFICATION/YANDEX_SITE_VERIFICATION (S2 в ROADMAP.md) читаются
# в app/layout.tsx как обычный process.env.* внутри серверного кода — не
# через next.config.ts -> env и не через NEXT_PUBLIC_-префикс, так что в
# клиентский JS-бандл эти значения не попадают. Но у клиентского контейнера
# в docker-compose.prod.yml нет ни одного runtime env_file/environment (см.
# файл) — метаданные `metadata.verification` в app/layout.tsx резолвятся при
# `next build` (обычный статический export const metadata, не
# generateMetadata), а не заново на каждый запрос в уже собранном
# standalone-сервере. Поэтому значения нужны именно на этапе сборки — как и
# остальные ARG'и выше, иначе сайт соберётся, а мета-тег подтверждения
# молча не появится.
ARG GOOGLE_SITE_VERIFICATION
ARG YANDEX_SITE_VERIFICATION
ENV SERVER_URL=$SERVER_URL
ENV NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY=$NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY
ENV NEXT_PUBLIC_2GIS_KEY=$NEXT_PUBLIC_2GIS_KEY
ENV NEXT_PUBLIC_DADATA_KEY=$NEXT_PUBLIC_DADATA_KEY
ENV GOOGLE_SITE_VERIFICATION=$GOOGLE_SITE_VERIFICATION
ENV YANDEX_SITE_VERIFICATION=$YANDEX_SITE_VERIFICATION

COPY package.json package-lock.json ./
RUN npm ci

# Нативные бинарники под linux, которых нет в lock-файле. Причина общая:
# package-lock.json сгенерирован на Windows, и платформенные пакеты в нём
# записаны только для win32 — из всего семейства sharp, например, там лежит
# один @img/sharp-win32-x64. `npm ci` ставит JS-обёртки, а бинарники под linux
# взять неоткуда.
#
# Для sharp это выглядело наружу не как ошибка, а как «оптимизация картинок не
# работает»: require('sharp') падает, оптимизатор Next (/_next/image) ловит
# падение и молча отдаёт ИСХОДНЫЙ файл — с правильными заголовками кеша, так
# что по ответу и не скажешь, что сломалось. Отсюда 2 МБ JPEG в карточке
# 248×248 и 8,3 МБ картинок на главной (см. аудит, P1).
#
# ВАЖНО: все три пакета ставятся ОДНОЙ командой намеренно. `npm install`
# каждый раз пересобирает дерево целиком и вычищает из него пакеты, которых
# нет ни в package.json, ни в lock — а поставленные с --no-save как раз такие.
# Двумя отдельными командами вторая сносила бы то, что поставила первая, и
# сборка падала бы на `next build` уже без lightningcss.
#
# Версия sharp-бинарника берётся ровно из установленной обёртки: sharp сверяет
# версии и отказывается работать при расхождении.
RUN SHARP_VERSION="$(node -p "require('sharp/package.json').version")" && \
    npm install --no-save \
      lightningcss-linux-x64-gnu \
      @tailwindcss/oxide-linux-x64-gnu \
      "@img/sharp-linux-x64@${SHARP_VERSION}"

COPY . .
RUN npm run build

# ---- runtime: alpine ок — у Next.js в отличие от сервера нет нативных
# ONNX/Prisma-зависимостей, только чистый JS/React ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# standalone-сборка уже содержит минимальный node_modules и server.js —
# полный npm install в рантейм-образе не нужен
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Явная проверка, что sharp действительно доехал до финального образа и
# грузится. Трассировка зависимостей у standalone-сборки затягивает sharp
# автоматически, но полагаться на это молча нельзя: если она once сломается,
# сайт продолжит работать и просто перестанет оптимизировать картинки — самый
# неприятный тип поломки, который замечают через недели по счетам за трафик.
# Пусть лучше падает сборка.
RUN node -e "require('sharp'); console.log('sharp: ok')"

EXPOSE 3000
CMD ["node", "server.js"]
