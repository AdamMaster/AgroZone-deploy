#!/bin/bash
# Ночная копия фото из бакета с медиа (S3_BUCKET_NAME) в бакет бэкапов,
# папка media/. Запускается cron'ом на сервере, см. DEPLOY.md, раздел 6.6.
#
# Что копируется: оригиналы (ads/, avatars/, chat/ и т.д.). Копии фото
# объявлений (ads/…_400/_800/_1280/_card.webp) не копируются: они
# восстанавливаются из оригиналов скриптом images:generate-variants.
#
# Файлы, удалённые из основного бакета, из бэкапа НЕ удаляются (sync без
# --delete): так бэкап защищает и от случайного удаления, и от ошибки в коде.
# Это же значит, что папка media/ только растёт; потерянные файлы можно
# чистить отдельно, осознанно.
#
# Параметры: --dry-run — показать, что было бы скопировано, ничего не меняя.
set -euo pipefail

ENVF="${ENVF:-/root/agro-zone/server/.env}"
BACKUP_BUCKET="${BACKUP_BUCKET:-agrozone-backups}"
CA_BUNDLE="${CA_BUNDLE:-/root/ca-bundle.pem}"
LOCK=/tmp/backup-media.lock

DRY_RUN=()
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=(--dryrun)

# Два запуска одновременно (например, ручной поверх ночного) не нужны.
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(date -Is) SKIP: предыдущий запуск ещё идёт" >&2
  exit 0
fi

# Значение переменной из .env приложения (те же ключи, что у бэкапа базы).
envval() { grep -E "^$1=" "$ENVF" | head -1 | cut -d= -f2- | tr -d '\r' | sed -E "s/^['\"]//; s/['\"]$//"; }

export AWS_ACCESS_KEY_ID="$(envval S3_ACCESS_KEY)"
export AWS_SECRET_ACCESS_KEY="$(envval S3_SECRET_KEY)"
REGION="$(envval S3_REGION)"
export AWS_DEFAULT_REGION="${REGION:-ru-6}"
# Selectel не поддерживает новые контрольные суммы aws-cli.
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
EP="$(envval S3_ENDPOINT)"
SRC_BUCKET="$(envval S3_BUCKET_NAME)"

for name in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY EP SRC_BUCKET; do
  if [[ -z "${!name}" ]]; then
    echo "$(date -Is) ERROR: не задано значение $name в $ENVF" >&2
    exit 1
  fi
done

s3() {
  docker run --rm -e AWS_CA_BUNDLE=/ca.pem -v "$CA_BUNDLE":/ca.pem:ro \
    -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION \
    -e AWS_REQUEST_CHECKSUM_CALCULATION -e AWS_RESPONSE_CHECKSUM_VALIDATION \
    amazon/aws-cli --endpoint-url "$EP" s3 "$@" < /dev/null
}

echo "$(date -Is) START s3://$SRC_BUCKET -> s3://$BACKUP_BUCKET/media/ ${DRY_RUN[*]:-}"

if ! s3 sync "s3://$SRC_BUCKET" "s3://$BACKUP_BUCKET/media" \
  --exclude 'ads/*_400.webp' --exclude 'ads/*_800.webp' \
  --exclude 'ads/*_1280.webp' --exclude 'ads/*_card.webp' \
  --only-show-errors "${DRY_RUN[@]}"; then
  echo "$(date -Is) ERROR: копирование фото в бакет бэкапов не удалось" >&2
  exit 1
fi

# Контроль: сколько оригиналов в основном бакете и сколько их в бэкапе.
# В бэкапе может быть больше (удалённые файлы остаются), меньше — нет.
SRC_COUNT="$(s3 ls "s3://$SRC_BUCKET/" --recursive | awk '{print $4}' | grep -Evc '^ads/.*_(400|800|1280|card)\.webp$' || true)"
DST_COUNT="$(s3 ls "s3://$BACKUP_BUCKET/media/" --recursive | wc -l)"
echo "$(date -Is) OK оригиналов в основном бакете: $SRC_COUNT, в бэкапе: $DST_COUNT"

if [[ -z "${DRY_RUN[*]:-}" && "$DST_COUNT" -lt "$SRC_COUNT" ]]; then
  echo "$(date -Is) ERROR: в бэкапе меньше файлов, чем в основном бакете" >&2
  exit 1
fi
