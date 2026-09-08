import pathlib

p = pathlib.Path("server/prisma/data/categories.ts")
s = p.read_text(encoding="utf-8")


def replace_once(s, old, new, label):
    n = s.count(old)
    assert n == 1, f"{label}: expected exactly 1 occurrence, got {n}"
    return s.replace(old, new)


# ── 1. Insert new categoryFeatures consts, right before DEFAULT_PRICE_UNITS_BY_FEATURES ──

FEATURE_CONSTS = """
// ── Услуги (F18) ──────────────────────────────────────────────────────
// Таксономия — по образцу agroserver.ru (решение владельца 08.09.2026):
// 27 категорий услуг реального работающего конкурента в этой же нише,
// без сокращений — категория в дереве ничего не стоит держать пустой,
// в отличие от полноценных фич вроде F9/F5/F7, где откладывается целый
// механизм (платежи, сравнение, отклики), а не просто пункт таксономии.
// service_area — везде TEXT и filterable: false: у услуги часто нет
// фиксированной точки (база + радиус выезда), а не готовый адрес, как у
// товара; отдельное структурированное гео-поле с поиском по радиусу
// (по аналогии с F3, но в обратную сторону — не покупатель ищет вокруг
// себя, а нужно найти услуги, покрывающие точку покупателя) решили не
// делать для v1 — свободного текста в характеристике достаточно.

const SERVICE_FIELD_WORK_FEATURES = [
  {
    name: 'work_type',
    label: 'Вид работ',
    type: 'SELECT',
    options: [
      'Вспашка/культивация',
      'Посев',
      'Опрыскивание/внесение СЗР',
      'Внесение удобрений',
      'Уборка урожая',
      'Другое'
    ]
  },
  {
    name: 'equipment',
    label: 'Техника',
    type: 'TEXT',
    placeholder: 'Марка/модель техники, которой оказывается услуга',
    filterable: false
  },
  {
    name: 'service_area',
    label: 'Зона обслуживания',
    type: 'TEXT',
    placeholder: 'Например, Ставропольский край, радиус 150 км',
    filterable: false
  }
] satisfies CategoryFeatureSeed[]

const SERVICE_TRANSPORT_FEATURES = [
  { name: 'cargo_type', label: 'Тип груза', type: 'TEXT' },
  {
    name: 'vehicle_type',
    label: 'Тип транспорта',
    type: 'SELECT',
    options: ['Зерновоз', 'Скотовоз', 'Рефрижератор', 'Бортовой/тент', 'Самосвал', 'Другое']
  },
  { name: 'capacity', label: 'Грузоподъёмность', type: 'NUMBER', units: ['кг', 'т'] },
  {
    name: 'service_area',
    label: 'География перевозок',
    type: 'TEXT',
    placeholder: 'Например, ЮФО и СКФО',
    filterable: false
  }
] satisfies CategoryFeatureSeed[]

const SERVICE_RENTAL_FEATURES = [
  { name: 'equipment_type', label: 'Марка/модель техники', type: 'TEXT' },
  { name: 'with_operator', label: 'Условия аренды', type: 'SELECT', options: ['С оператором', 'Без оператора'] },
  { name: 'service_area', label: 'Зона подачи техники', type: 'TEXT', filterable: false }
] satisfies CategoryFeatureSeed[]

const SERVICE_REPAIR_FEATURES = [
  { name: 'equipment_type', label: 'Какую технику/оборудование обслуживают', type: 'TEXT' },
  {
    name: 'onsite',
    label: 'Формат работы',
    type: 'SELECT',
    options: ['Выезд к клиенту', 'Только в сервисе', 'Выезд и в сервисе']
  },
  { name: 'service_area', label: 'Зона выезда', type: 'TEXT', filterable: false }
] satisfies CategoryFeatureSeed[]

const SERVICE_STORAGE_FEATURES = [
  {
    name: 'storage_type',
    label: 'Тип хранения',
    type: 'SELECT',
    options: ['Элеватор/зерносклад', 'Овощехранилище', 'Холодильный склад', 'Открытая площадка', 'Универсальный склад']
  },
  { name: 'capacity', label: 'Вместимость', type: 'NUMBER', units: ['т', 'м³'] },
  { name: 'service_area', label: 'Расположение склада', type: 'TEXT', filterable: false }
] satisfies CategoryFeatureSeed[]

const SERVICE_PROCESSING_FEATURES = [
  { name: 'raw_material', label: 'Сырьё/продукция', type: 'TEXT' },
  { name: 'min_batch', label: 'Минимальный объём партии', type: 'NUMBER', units: ['кг', 'т'] },
  { name: 'service_area', label: 'Зона обслуживания', type: 'TEXT', filterable: false }
] satisfies CategoryFeatureSeed[]

const SERVICE_CONSULTING_FEATURES = [
  { name: 'specialization', label: 'Специализация', type: 'TEXT' },
  { name: 'onsite', label: 'Формат работы', type: 'SELECT', options: ['Выезд', 'Дистанционно', 'Выезд и дистанционно'] },
  { name: 'service_area', label: 'Зона обслуживания', type: 'TEXT', filterable: false }
] satisfies CategoryFeatureSeed[]

const SERVICE_CONSTRUCTION_FEATURES = [
  { name: 'object_type', label: 'Тип объекта', type: 'TEXT', placeholder: 'Например, элеватор, теплица, ангар' },
  { name: 'service_area', label: 'Зона обслуживания', type: 'TEXT', filterable: false }
] satisfies CategoryFeatureSeed[]

const SERVICE_SANITATION_FEATURES = [
  { name: 'object_type', label: 'Что обрабатывают', type: 'TEXT', placeholder: 'Например, склад, ферма, техника' },
  { name: 'service_area', label: 'Зона выезда', type: 'TEXT', filterable: false }
] satisfies CategoryFeatureSeed[]

const SERVICE_TOURISM_FEATURES = [
  {
    name: 'format',
    label: 'Формат',
    type: 'TEXT',
    placeholder: 'Например, экскурсии, проживание, дегустации',
    filterable: false
  },
  { name: 'service_area', label: 'Расположение', type: 'TEXT', filterable: false }
] satisfies CategoryFeatureSeed[]

const SERVICE_SEEDLING_FEATURES = [
  { name: 'crop_type', label: 'Культура', type: 'TEXT' },
  { name: 'service_area', label: 'Зона обслуживания', type: 'TEXT', filterable: false }
] satisfies CategoryFeatureSeed[]

const SERVICE_SEED_PREP_FEATURES = [
  {
    name: 'prep_type',
    label: 'Вид подготовки',
    type: 'SELECT',
    options: ['Протравливание', 'Калибровка', 'Инкрустация/дражирование', 'Комплексная подготовка']
  },
  { name: 'service_area', label: 'Зона обслуживания', type: 'TEXT', filterable: false }
] satisfies CategoryFeatureSeed[]

const SERVICE_ANIMAL_KEEPING_FEATURES = [
  { name: 'animal_type', label: 'Вид животных', type: 'TEXT' },
  { name: 'service_area', label: 'Расположение', type: 'TEXT', filterable: false }
] satisfies CategoryFeatureSeed[]

const SERVICE_WASTE_FEATURES = [
  { name: 'waste_type', label: 'Тип отходов', type: 'TEXT' },
  { name: 'service_area', label: 'Зона обслуживания', type: 'TEXT', filterable: false }
] satisfies CategoryFeatureSeed[]

"""

s = replace_once(
    s,
    "const DEFAULT_PRICE_UNITS_BY_FEATURES = new Map<CategoryFeatureSeed[], string[]>([",
    FEATURE_CONSTS.lstrip("\n") + "const DEFAULT_PRICE_UNITS_BY_FEATURES = new Map<CategoryFeatureSeed[], string[]>([",
    "insert feature consts"
)

# ── 2. Register price units for the new consts in the Map ──

MAP_ENTRIES = """  [VET_CONSUMABLES_FEATURES, ['ITEM', 'BAG']],
  [SERVICE_FIELD_WORK_FEATURES, ['HA', 'HOUR', 'ITEM']],
  [SERVICE_TRANSPORT_FEATURES, ['TON', 'ITEM']],
  [SERVICE_RENTAL_FEATURES, ['HOUR', 'ITEM']],
  [SERVICE_REPAIR_FEATURES, ['HOUR', 'ITEM']],
  [SERVICE_STORAGE_FEATURES, ['TON', 'ITEM']],
  [SERVICE_PROCESSING_FEATURES, ['TON', 'KG', 'ITEM']],
  [SERVICE_CONSULTING_FEATURES, ['ITEM', 'HOUR']],
  [SERVICE_CONSTRUCTION_FEATURES, ['ITEM']],
  [SERVICE_SANITATION_FEATURES, ['ITEM']],
  [SERVICE_TOURISM_FEATURES, ['ITEM']],
  [SERVICE_SEEDLING_FEATURES, ['ITEM']],
  [SERVICE_SEED_PREP_FEATURES, ['TON', 'KG', 'ITEM']],
  [SERVICE_ANIMAL_KEEPING_FEATURES, ['HEAD', 'ITEM']],
  [SERVICE_WASTE_FEATURES, ['TON', 'M3', 'ITEM']]"""

s = replace_once(
    s,
    "  [VET_CONSUMABLES_FEATURES, ['ITEM', 'BAG']]",
    MAP_ENTRIES,
    "insert map entries"
)

# ── 3. Add the "Услуги" top-level branch to CATEGORY_TREE ──

SERVICES_CATEGORY = """  },
  {
    name: 'Услуги',
    id: 'cat_0gl7jms',
    aliases: ['Сельхозуслуги', 'Услуги для АПК'],
    iconId: 'Wrench',
    children: [
      { name: 'Грузоперевозки', id: 'cat_02s8hvj', children: [], categoryFeatures: SERVICE_TRANSPORT_FEATURES },
      { name: 'Информационные услуги', id: 'cat_0v0e4gy', children: [], categoryFeatures: SERVICE_CONSULTING_FEATURES },
      {
        name: 'Проектирование и строительство с/х объектов',
        id: 'cat_1gzxue7',
        children: [],
        categoryFeatures: SERVICE_CONSTRUCTION_FEATURES
      },
      {
        name: 'Ремонт и сервисное обслуживание',
        id: 'cat_1i6zqof',
        children: [],
        categoryFeatures: SERVICE_REPAIR_FEATURES
      },
      { name: 'Складские услуги', id: 'cat_0c4fbk3', children: [], categoryFeatures: SERVICE_STORAGE_FEATURES },
      {
        name: 'Услуги дилера, дистрибьютора, агента',
        id: 'cat_1rm8eoy',
        children: [],
        categoryFeatures: SERVICE_CONSULTING_FEATURES
      },
      {
        name: 'Услуги переработки с/х сырья',
        id: 'cat_1qjlvz1',
        children: [],
        categoryFeatures: SERVICE_PROCESSING_FEATURES
      },
      {
        name: 'Услуги по уборке урожая',
        id: 'cat_1ane4jb',
        children: [],
        categoryFeatures: SERVICE_FIELD_WORK_FEATURES
      },
      { name: 'Услуги полевых работ', id: 'cat_1ozkpk1', children: [], categoryFeatures: SERVICE_FIELD_WORK_FEATURES },
      {
        name: 'Услуги фасовки, упаковки, розлива',
        id: 'cat_0embg8u',
        children: [],
        categoryFeatures: SERVICE_PROCESSING_FEATURES
      },
      { name: 'Авиахимработы', id: 'cat_1byk23n', children: [], categoryFeatures: SERVICE_FIELD_WORK_FEATURES },
      { name: 'Аренда спецтехники', id: 'cat_0umoswa', children: [], categoryFeatures: SERVICE_RENTAL_FEATURES },
      { name: 'Инвестиции в с/х', id: 'cat_1tbd5b4', children: [], categoryFeatures: SERVICE_CONSULTING_FEATURES },
      {
        name: 'Производство продукции под ТМ заказчика',
        id: 'cat_19zuap7',
        children: [],
        categoryFeatures: SERVICE_PROCESSING_FEATURES
      },
      { name: 'Санитарная обработка', id: 'cat_09o6sws', children: [], categoryFeatures: SERVICE_SANITATION_FEATURES },
      { name: 'Сельский туризм', id: 'cat_0jz90mp', children: [], categoryFeatures: SERVICE_TOURISM_FEATURES },
      { name: 'Услуги агронома', id: 'cat_0zs8ktt', children: [], categoryFeatures: SERVICE_CONSULTING_FEATURES },
      { name: 'Услуги ветеринара', id: 'cat_0mjogbg', children: [], categoryFeatures: SERVICE_CONSULTING_FEATURES },
      {
        name: 'Услуги очистки, сушки и хранения зерна',
        id: 'cat_12l1fl5',
        children: [],
        categoryFeatures: SERVICE_STORAGE_FEATURES
      },
      {
        name: 'Автоматизация и модернизация производства',
        id: 'cat_197t6zj',
        children: [],
        categoryFeatures: SERVICE_REPAIR_FEATURES
      },
      {
        name: 'Услуги по выращиванию рассады',
        id: 'cat_0c55oea',
        children: [],
        categoryFeatures: SERVICE_SEEDLING_FEATURES
      },
      {
        name: 'Услуги по подготовке семян',
        id: 'cat_1jzm46b',
        children: [],
        categoryFeatures: SERVICE_SEED_PREP_FEATURES
      },
      {
        name: 'Услуги по содержанию с/х животных',
        id: 'cat_1uq7gr3',
        children: [],
        categoryFeatures: SERVICE_ANIMAL_KEEPING_FEATURES
      },
      {
        name: 'Услуги по убою и первичной переработке',
        id: 'cat_13ubz4w',
        children: [],
        categoryFeatures: SERVICE_PROCESSING_FEATURES
      },
      { name: 'Услуги сертификации', id: 'cat_1eqnmy1', children: [], categoryFeatures: SERVICE_CONSULTING_FEATURES },
      { name: 'Утилизация отходов', id: 'cat_1m9uawl', children: [], categoryFeatures: SERVICE_WASTE_FEATURES },
      { name: 'Учебные центры', id: 'cat_010s234', children: [], categoryFeatures: SERVICE_CONSULTING_FEATURES }
    ]
  }
] satisfies CategorySeed[]"""

old_tail = """    name: 'Земли и объекты с/х недвижимости',
    id: 'cat_0pypyaf',
    aliases: ['Земельные участки', 'Недвижимость', 'Земля'],
    iconId: 'LandPlot',
    children: [],
    categoryFeatures: REAL_ESTATE_LAND_FEATURES,
    priceUnits: ['ITEM', 'HA']
  }
] satisfies CategorySeed[]"""

new_tail = """    name: 'Земли и объекты с/х недвижимости',
    id: 'cat_0pypyaf',
    aliases: ['Земельные участки', 'Недвижимость', 'Земля'],
    iconId: 'LandPlot',
    children: [],
    categoryFeatures: REAL_ESTATE_LAND_FEATURES,
    priceUnits: ['ITEM', 'HA']
""" + SERVICES_CATEGORY

s = replace_once(s, old_tail, new_tail, "insert Услуги category branch")

p.write_text(s, encoding="utf-8")
print("OK")
