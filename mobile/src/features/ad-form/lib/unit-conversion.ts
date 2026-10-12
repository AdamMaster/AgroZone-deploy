// Пересчёт числовых характеристик (мощность, масса партии…) в каноническую
// единицу категории — как unit-conversion.ts сайта. Первая единица фичи —
// каноническая: в ней значение хранится и фильтруется.
//
// Не все наборы единиц — одна величина: package_size ['мл', 'л', 'г',
// 'кг'] — выбор между объёмом и массой; такие значения не пересчитываются.

type UnitDimension = Record<string, number>

// Единицы одной физической величины и их соотношения.
const MASS: UnitDimension = { г: 1, кг: 1000, т: 1_000_000 }
const VOLUME: UnitDimension = { мл: 1, л: 1000, 'м³': 1_000_000 }
const POWER: UnitDimension = { кВт: 1, 'л.с.': 0.7355 }
const TIME: UnitDimension = { 'дн.': 1, 'нед.': 7, 'мес.': 30, год: 365 }
const LENGTH: UnitDimension = { мм: 1, см: 10, м: 1000 }

const DIMENSIONS: readonly UnitDimension[] = [MASS, VOLUME, POWER, TIME, LENGTH]

const findCommonDimension = (units: readonly string[]): UnitDimension | null =>
  DIMENSIONS.find(dimension => units.every(unit => unit in dimension)) ?? null

// Можно ли пересчитывать между единицами (одна физическая величина).
export function isConvertible(units: readonly string[] | undefined): boolean {
  if (!units || units.length <= 1) return true

  return findCommonDimension(units) !== null
}

// 130 × 0.7355 в двоичной арифметике — 95.61500000000001; двух знаков
// после запятой хватает для всех величин.
const roundConverted = (value: number): number => Math.round(value * 100) / 100

export function convertToCanonical(value: number, fromUnit: string, canonicalUnit: string): number {
  if (fromUnit === canonicalUnit) return value

  const dimension = findCommonDimension([fromUnit, canonicalUnit])
  if (!dimension) return value

  return roundConverted((value * dimension[fromUnit]) / dimension[canonicalUnit])
}
