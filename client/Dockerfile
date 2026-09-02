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
ENV SERVER_URL=$SERVER_URL
ENV NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY=$NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY
ENV NEXT_PUBLIC_2GIS_KEY=$NEXT_PUBLIC_2GIS_KEY
ENV NEXT_PUBLIC_DADATA_KEY=$NEXT_PUBLIC_DADATA_KEY

COPY package.json package-lock.json ./
RUN npm ci
RUN npm install lightningcss-linux-x64-gnu @tailwindcss/oxide-linux-x64-gnu --no-save

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

EXPOSE 3000
CMD ["node", "server.js"]
