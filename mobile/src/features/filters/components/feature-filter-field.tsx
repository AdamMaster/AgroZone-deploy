import { useState } from 'react'
import { Switch, Text, View } from 'react-native'

import type { CategoryFeature } from '@/features/categories/types/category.types'

import { Checkbox } from '@/shared/components/checkbox'
import { FieldLabel } from '@/shared/components/field-label'
import { Input } from '@/shared/components/input'
import { SelectField } from '@/shared/components/select-field'
import { useThemeColor } from '@/shared/hooks/use-theme-color'

import type { FeatureFilterValue } from '../types/filter.types'

interface FeatureFilterFieldProps {
  feature: CategoryFeature
  value: FeatureFilterValue | undefined
  onChange: (value: FeatureFilterValue | undefined) => void
}

type Range = { min?: number; max?: number }

const asRange = (value: FeatureFilterValue | undefined): Range | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : undefined

const toRangeValue = (min: number | undefined, max: number | undefined): Range | undefined =>
  min === undefined && max === undefined ? undefined : { min, max }

// Фильтр по одной характеристике категории — как FilterFeatureField
// сайта: диапазон для чисел, список лет для года выпуска, галочки для
// вариантов, переключатель для «да/нет».
export function FeatureFilterField(props: FeatureFilterFieldProps) {
  switch (props.feature.type) {
    case 'NUMBER':
      // У года выпуска (во всех категориях техники — name 'year') выбор из
      // списка надёжнее ввода: «1500» или «20266» заведомо ничего не найдут.
      return props.feature.name === 'year' ? <YearRangeField {...props} /> : <NumberRangeField {...props} />
    case 'SELECT':
    case 'MULTI_SELECT':
      return <OptionsField {...props} />
    case 'BOOLEAN':
      return <BooleanField {...props} />
    default:
      return null
  }
}

// Число с дробной частью: запятую с русской клавиатуры принимаем как точку.
const sanitizeDecimal = (text: string) => {
  const [integer = '', ...fraction] = text
    .replace(',', '.')
    .replace(/[^\d.]/g, '')
    .split('.')
  return fraction.length ? `${integer}.${fraction.join('')}` : integer
}

const parseDecimal = (text: string) => {
  const parsed = Number.parseFloat(text)
  return Number.isFinite(parsed) ? parsed : undefined
}

function NumberRangeField({ feature, value, onChange }: FeatureFilterFieldProps) {
  const range = asRange(value)
  // Текст поля храним отдельно от значения: иначе «5.» при вводе дробного
  // числа сразу превращалось бы в «5».
  const [min, setMin] = useState(range?.min !== undefined ? String(range.min) : '')
  const [max, setMax] = useState(range?.max !== undefined ? String(range.max) : '')
  // Значения хранятся и фильтруются в канонической единице (первой в
  // списке) — подписываем её, чтобы «5» не гадали: метры это или миллиметры.
  const unit = feature.units?.[0]

  const change = (nextMin: string, nextMax: string) => {
    setMin(nextMin)
    setMax(nextMax)
    onChange(toRangeValue(parseDecimal(nextMin), parseDecimal(nextMax)))
  }

  return (
    <View className='gap-2'>
      <FieldLabel>{unit ? `${feature.label}, ${unit}` : feature.label}</FieldLabel>
      <View className='flex-row gap-2'>
        <Input
          isFluid
          value={min}
          onChangeText={text => change(sanitizeDecimal(text), max)}
          placeholder='От'
          accessibilityLabel={`${feature.label} от`}
          keyboardType='decimal-pad'
        />
        <Input
          isFluid
          value={max}
          onChangeText={text => change(min, sanitizeDecimal(text))}
          placeholder='До'
          accessibilityLabel={`${feature.label} до`}
          keyboardType='decimal-pad'
        />
      </View>
    </View>
  )
}

// Самая старая техника, которая реально встречается в продаже (советские
// тракторы 60-х), — с запасом; верхняя граница — текущий год.
const MIN_YEAR = 1960
const CURRENT_YEAR = new Date().getFullYear()

const yearOptions = (placeholder: string) => [
  { value: '', label: placeholder },
  ...Array.from({ length: CURRENT_YEAR - MIN_YEAR + 1 }, (_, index) => {
    const year = String(CURRENT_YEAR - index)
    return { value: year, label: year }
  })
]

const YEAR_FROM_OPTIONS = yearOptions('От')
const YEAR_TO_OPTIONS = yearOptions('До')

const toYear = (value: string) => (value ? Number(value) : undefined)
const fromYear = (year: number | undefined) => (year === undefined ? '' : String(year))

function YearRangeField({ feature, value, onChange }: FeatureFilterFieldProps) {
  const range = asRange(value)

  return (
    <View className='gap-2'>
      <FieldLabel>{feature.label}</FieldLabel>
      <View className='flex-row gap-2'>
        <SelectField
          width='flex'
          value={fromYear(range?.min)}
          options={YEAR_FROM_OPTIONS}
          onChange={year => onChange(toRangeValue(toYear(year), range?.max))}
          accessibilityLabel={`${feature.label} от`}
        />
        <SelectField
          width='flex'
          value={fromYear(range?.max)}
          options={YEAR_TO_OPTIONS}
          onChange={year => onChange(toRangeValue(range?.min, toYear(year)))}
          accessibilityLabel={`${feature.label} до`}
        />
      </View>
    </View>
  )
}

function OptionsField({ feature, value, onChange }: FeatureFilterFieldProps) {
  const selected = Array.isArray(value) ? value : []

  if (!feature.options?.length) return null

  const toggle = (option: string, isChecked: boolean) => {
    const next = isChecked ? [...selected, option] : selected.filter(item => item !== option)
    onChange(next.length ? next : undefined)
  }

  return (
    <View className='gap-2'>
      <FieldLabel>{feature.label}</FieldLabel>
      <View className='gap-2'>
        {feature.options.map(option => (
          <Checkbox
            key={option}
            checked={selected.includes(option)}
            onChange={isChecked => toggle(option, isChecked)}
            accessibilityLabel={`${feature.label}: ${option}`}
            label={<Text className='text-sm text-gray-950'>{option}</Text>}
          />
        ))}
      </View>
    </View>
  )
}

function BooleanField({ feature, value, onChange }: FeatureFilterFieldProps) {
  const primaryColor = useThemeColor('--color-primary')

  return (
    <View className='flex-row items-center gap-3 self-start'>
      <Text className='text-sm text-gray-950'>{feature.label}</Text>
      <Switch
        value={value === true}
        onValueChange={isOn => onChange(isOn ? true : undefined)}
        trackColor={{ true: primaryColor }}
        accessibilityLabel={feature.label}
      />
    </View>
  )
}
