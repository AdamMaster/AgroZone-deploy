import pathlib

p = pathlib.Path("server/prisma/seed.ts")
s = p.read_text(encoding="utf-8")

old = """  const categoryData = {
    name: data.name,
    description: data.description ?? null,
    slug,
    path,
    fullPath,
    code,
    iconId: data.iconId,
    priceUnits,
    level,
    sortOrder,
    parentId
  }

  const category = existing
    ? await prisma.category.update({ where: { id: existing.id }, data: categoryData })
    : await prisma.category.create({ data: { id: data.id, ...categoryData } })"""

new = """  const categoryData = {
    name: data.name,
    slug,
    path,
    fullPath,
    code,
    iconId: data.iconId,
    priceUnits,
    level,
    sortOrder,
    parentId
  }

  // description намеренно вынесен из общего categoryData: этим полем
  // управляет отдельный скрипт (enrich-category-descriptions.ts, GigaChat
  // генерирует список синонимов под каждую категорию), а не дерево в
  // data/categories.ts — там description почти никогда не задаётся явно.
  // Раньше здесь было "description: data.description ?? null" прямо в
  // categoryData, и это затирало уже обогащённое описание в null при
  // КАЖДОМ прогоне сида, даже если дерево вообще не несёт своего значения
  // (см. обсуждение с пользователем — нашли при добавлении раздела
  // "Услуги"). Теперь при апдейте существующей категории описание трогаем,
  // только если дерево явно принесло своё значение — иначе оставляем то,
  // что уже в базе (GigaChat-обогащение или ручная правка).
  const category = existing
    ? await prisma.category.update({
        where: { id: existing.id },
        data: { ...categoryData, ...(data.description !== undefined ? { description: data.description } : {}) }
      })
    : await prisma.category.create({ data: { id: data.id, ...categoryData, description: data.description ?? null } })"""

assert s.count(old) == 1, f"expected 1, got {s.count(old)}"
s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("OK")
