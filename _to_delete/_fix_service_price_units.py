import pathlib

p = pathlib.Path("server/prisma/data/categories.ts")
s = p.read_text(encoding="utf-8")

def replace_once(s, old, new, label):
    n = s.count(old)
    assert n == 1, f"{label}: expected 1, got {n}"
    return s.replace(old, new)

# 1. Грузоперевозки: цена "за тонну" не отражает реальную модель ценообразования
# (зависит от маршрута/расстояния, а не только веса) — оставляем только ITEM
# ("Целиком" — фиксированная/договорная цена, см. shared/constants/units.ts на
# фронте). См. обсуждение с пользователем 08.09.2026.
s = replace_once(
    s,
    "  [SERVICE_TRANSPORT_FEATURES, ['TON', 'ITEM']],",
    "  [SERVICE_TRANSPORT_FEATURES, ['ITEM']],",
    "transport price units"
)

# 2. Услуги по убою и первичной переработке: в отличие от соседних категорий
# в этой же группе (переработка сырья, фасовка, производство под ТМ — там
# TON/KG уместны), убой на практике чаще всего оценивают за голову, а не
# только по весу — переопределяем priceUnits явно на этом узле (тот же приём,
# что уже используется у "Земли и объекты с/х недвижимости" ниже по файлу).
old_slaughter = """      {
        name: 'Услуги по убою и первичной переработке',
        id: 'cat_13ubz4w',
        children: [],
        categoryFeatures: SERVICE_PROCESSING_FEATURES
      },"""
new_slaughter = """      {
        name: 'Услуги по убою и первичной переработке',
        id: 'cat_13ubz4w',
        children: [],
        categoryFeatures: SERVICE_PROCESSING_FEATURES,
        priceUnits: ['HEAD', 'KG', 'ITEM']
      },"""
s = replace_once(s, old_slaughter, new_slaughter, "slaughter price units")

p.write_text(s, encoding="utf-8")
print("OK")
