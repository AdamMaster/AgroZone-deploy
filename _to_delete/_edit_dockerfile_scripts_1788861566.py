import pathlib

p = pathlib.Path("server/Dockerfile")
s = p.read_text(encoding="utf-8")


def replace_once(s, old, new, label):
    n = s.count(old)
    assert n == 1, f"{label}: expected exactly 1 occurrence, got {n}"
    return s.replace(old, new)


OLD = """COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/certs ./certs
"""

NEW = """COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/certs ./certs
# src/ и scripts/ (TS-исходники, не dist) - нужны, чтобы разовые
# обслуживающие скрипты (prisma:seed, categories:enrich-descriptions,
# embeddings:precompute, backfill-*) можно было гонять прямо в прод-
# контейнере через ts-node (docker compose exec server npm run ...),
# как и предполагает DEPLOY.md. Раньше runtime-стейдж копировал только
# dist - с ним такие скрипты падали с Cannot find module (нашли
# 08.09.2026 при попытке прогнать categories:enrich-descriptions на
# проде после сида раздела Услуги). Он же обосновывает и однослойную
# сборку выше (без --omit=dev): ts-node/tsconfig-paths лежат в
# devDependencies и без них тоже не завелись бы.
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
"""

s = replace_once(s, OLD, NEW, "runtime COPY block")
p.write_text(s, encoding="utf-8")
print("OK")
