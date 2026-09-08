import pathlib

p = pathlib.Path("server/prisma/data/categories.ts")
s = p.read_text(encoding="utf-8")

old = """const SERVICE_ANIMAL_KEEPING_FEATURES = [
  { name: 'animal_type', label: 'Вид животных', type: 'TEXT' },
  { name: 'service_area', label: 'Расположение', type: 'TEXT', filterable: false }
] satisfies CategoryFeatureSeed[]"""

new = """const SERVICE_ANIMAL_KEEPING_FEATURES = [
  {
    name: 'animal_type',
    label: 'Вид животных',
    type: 'MULTI_SELECT',
    options: ['КРС', 'Свиньи', 'Овцы, козы', 'Лошади', 'Птица', 'Кролики', 'Пчёлы', 'Рыба', 'Универсальный']
  },
  { name: 'service_area', label: 'Расположение', type: 'TEXT', filterable: false }
] satisfies CategoryFeatureSeed[]"""

assert s.count(old) == 1, f"expected 1, got {s.count(old)}"
s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("OK")
