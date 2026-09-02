// Конвертация числовых характеристик объявления (Мощность, Масса партии и
// т.п.) в каноническую единицу измерения категории.
//
// В data/categories.ts у NUMBER-характеристики бывает несколько единиц на
// выбор (units), например power: ['кВт', 'л.с.'] — продавец может ввести
// значение в любой из них. Раньше выбор единицы вообще нигде не
// сохранялся и не показывался (см. обсуждение с пользователем про поле
// "Мощность" — просто голое число без единицы). Теперь первый элемент
// массива units — каноническая единица, именно в ней значение хранится в
// Ad.features, а конвертация из выбранной пользователем единицы происходит
// тут, на клиенте, перед отправкой формы.
//
// Важный нюанс: не все поля с несколькими units — это на самом деле одна
// физическая величина. Например package_size: ['мл', 'л', 'г', 'кг'] — это
// НЕ "объём в разных единицах", а выбор между объёмом (для жидких
// препаратов) и массой (для сыпучих) — величины принципиально разной
// физической природы, их нельзя пересчитать друг в друга. Такие поля
// isConvertible() ниже правильно определяет как неконвертируемые:
// конвертация для них не производится (передаётся как есть, 1:1), но
// выбранная единица всё равно запоминается отдельно — см.
// dynamic-field.tsx (companion-поле `${feature.name}__unit`) — просто
// без попытки пересчёта числа.

type UnitDimension = Record<string, number>

// Каждая карта — единицы одной физической величины, значение — во сколько
// раз единица больше "внутреннего" опорного шага (сам опорный шаг
// значения не имеет, важны только соотношения между единицами одной
// карты).
const MASS: UnitDimension = { г: 1, кг: 1000, т: 1_000_000 }
const VOLUME: UnitDimension = { мл: 1, л: 1000, 'м³': 1_000_000 }
const POWER: UnitDimension = { 'кВт': 1, 'л.с.': 0.7355 }
const TIME: UnitDimension = { 'дн.': 1, 'нед.': 7, 'мес.': 30, год: 365 }
const LENGTH: UnitDimension = { мм: 1, см: 10, м: 1000 }

const DIMENSIONS: UnitDimension[] = [MASS, VOLUME, POWER, TIME, LENGTH]

/** Карта единиц, в которой встречаются ВСЕ переданные единицы — если такой нет, величины разной природы. */
function findCommonDimension(units: string[]): UnitDimension | null {
  return DIMENSIONS.find(dimension => units.every(u => u in dimension)) ?? null
}

/** true — можно математически пересчитывать между этими единицами (одна физическая величина). */
export function isConvertible(units: string[] | undefined): boolean {
  if (!units || units.length <= 1) return true // одна единица (или нет вовсе) — пересчитывать нечего
  return findCommonDimension(units) !== null
}

/**
 * Переводит value из fromUnit в canonicalUnit (обычно units[0] у фичи).
 * Если единицы разной физической природы (см. isConvertible) — значение
 * возвращается без изменений, конвертировать нечего.
 */
export function convertToCanonical(value: number, fromUnit: string, canonicalUnit: string): number {
  if (fromUnit === canonicalUnit) return value

  const dimension = findCommonDimension([fromUnit, canonicalUnit])
  if (!dimension) return value

  const inBase = value * dimension[fromUnit]
  return inBase / dimension[canonicalUnit]
}
