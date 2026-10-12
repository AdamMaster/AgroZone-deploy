import { useState } from 'react'
import { type Control, Controller } from 'react-hook-form'
import { Pressable, Text, View } from 'react-native'

import type { CategoryFeature } from '@/features/categories/types/category.types'

import { Checkbox } from '@/shared/components/checkbox'
import { FormField } from '@/shared/components/form-field'
import { Input } from '@/shared/components/input'
import { SelectField } from '@/shared/components/select-field'

import { unitKey } from '../lib/feature-values'
import type { AdFormFields } from '../schemas/ad-form.schema'

interface FeatureFieldProps {
  feature: CategoryFeature
  control: Control<AdFormFields>
}

const CHIP_CLASS = 'rounded-full border px-4 py-2'
const chipClass = (isSelected: boolean) =>
  `${CHIP_CLASS} ${isSelected ? 'border-secondary bg-secondary' : 'border-border bg-background active:bg-muted'}`
const chipTextClass = (isSelected: boolean) => `text-sm ${isSelected ? 'text-white' : 'text-foreground'}`

// Число из поля ввода: пусто — значения нет, запятая — как точка.
const parseNumber = (text: string): number | null => {
  const normalized = text.replace(/\s/g, '').replace(',', '.')
  if (!normalized) return null

  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

const numberToText = (value: unknown): string =>
  value === null || value === undefined || value === '' ? '' : String(value)

// Характеристика категории в форме объявления — DynamicField сайта: список,
// несколько вариантов, флажок, число (с выбором единицы) или текст.
export function FeatureField({ feature, control }: FeatureFieldProps) {
  return (
    <Controller
      control={control}
      name={`categoryFeatures.${feature.name}`}
      render={({ field, fieldState }) => {
        if (feature.type === 'BOOLEAN') {
          return (
            <Checkbox
              checked={!!field.value}
              onChange={field.onChange}
              accessibilityLabel={feature.label}
              label={<Text className='text-sm text-gray-900'>{feature.label}</Text>}
            />
          )
        }

        return (
          <FormField label={feature.label} error={fieldState.error?.message}>
            {feature.type === 'SELECT' ? (
              <SelectField
                value={typeof field.value === 'string' ? field.value : undefined}
                options={(feature.options ?? []).map(option => ({ value: option, label: option }))}
                onChange={field.onChange}
                accessibilityLabel={feature.label}
                placeholder='Не выбрано'
                width='full'
              />
            ) : feature.type === 'MULTI_SELECT' ? (
              <View className='flex-row flex-wrap gap-2'>
                {(feature.options ?? []).map(option => {
                  const values = Array.isArray(field.value) ? (field.value as string[]) : []
                  const isSelected = values.includes(option)

                  return (
                    <Pressable
                      key={option}
                      accessibilityRole='checkbox'
                      accessibilityState={{ checked: isSelected }}
                      onPress={() =>
                        field.onChange(isSelected ? values.filter(value => value !== option) : [...values, option])
                      }
                      className={chipClass(isSelected)}
                    >
                      <Text className={chipTextClass(isSelected)}>{option}</Text>
                    </Pressable>
                  )
                })}
              </View>
            ) : feature.type === 'NUMBER' ? (
              feature.name === 'caliber' ? (
                <CaliberInput value={field.value} onChange={field.onChange} unit={feature.units?.[0]} />
              ) : (
                <View className='flex-row items-center gap-2'>
                  <NumberInput label={feature.label} value={field.value} onChange={field.onChange} />
                  {feature.units?.length === 1 && <Text className='text-sm text-gray-500'>{feature.units[0]}</Text>}
                  {feature.units && feature.units.length > 1 && (
                    <UnitChips name={feature.name} units={feature.units} control={control} />
                  )}
                </View>
              )
            ) : (
              <Input
                value={numberToText(field.value)}
                onChangeText={text => field.onChange(text === '' ? null : text)}
                accessibilityLabel={feature.label}
              />
            )}
          </FormField>
        )
      }}
    />
  )
}

// Числовое поле: свой текст, чтобы можно было набрать «2,» на пути к «2,5».
function NumberInput({
  label,
  value,
  onChange
}: {
  label: string
  value: unknown
  onChange: (value: number | null) => void
}) {
  const [text, setText] = useState(() => numberToText(value))
  const external = numberToText(value)
  const [syncedExternal, setSyncedExternal] = useState(external)

  // Значение сменили снаружи (смена категории, загрузка объявления).
  if (external !== syncedExternal) {
    setSyncedExternal(external)
    if (parseNumber(text) !== value) setText(external)
  }

  return (
    <Input
      isFluid
      value={text}
      keyboardType='decimal-pad'
      accessibilityLabel={label}
      onChangeText={next => {
        const cleaned = next.replace(/[^\d.,]/g, '')
        setText(cleaned)
        onChange(parseNumber(cleaned))
      }}
    />
  )
}

// Несколько единиц (кВт / л.с.) — выбор кнопками; выбранная хранится рядом
// со значением (<name>__unit) и при отправке приводится к канонической.
function UnitChips({ name, units, control }: { name: string; units: string[]; control: Control<AdFormFields> }) {
  return (
    <Controller
      control={control}
      name={`categoryFeatures.${unitKey(name)}`}
      render={({ field }) => {
        const selected = typeof field.value === 'string' ? field.value : units[0]

        return (
          <View className='flex-row gap-1'>
            {units.map(unit => (
              <Pressable
                key={unit}
                accessibilityRole='radio'
                accessibilityState={{ checked: selected === unit }}
                onPress={() => field.onChange(unit)}
                className={`h-10 min-w-10 items-center justify-center rounded-full border px-3 ${
                  selected === unit ? 'border-secondary bg-secondary' : 'border-border bg-background active:bg-muted'
                }`}
              >
                <Text className={chipTextClass(selected === unit)}>{unit}</Text>
              </Pressable>
            ))}
          </View>
        )
      }}
    />
  )
}

// «Калибр» — несколько значений сразу («45+, 55+, 65»), через запятую или
// пробел: как CaliberInput сайта. Сохраняется массивом строк.
const caliberToText = (value: unknown): string => {
  if (Array.isArray(value)) return value.join(', ')
  return numberToText(value)
}

const parseCaliber = (text: string): string[] => {
  const seen = new Set<string>()

  return text
    .split(/[,\s]+/)
    .map(token => token.trim())
    .filter(token => {
      if (!/^\d+\+?$/.test(token) || seen.has(token)) return false
      seen.add(token)
      return true
    })
}

function CaliberInput({
  value,
  onChange,
  unit
}: {
  value: unknown
  onChange: (value: string[]) => void
  unit?: string
}) {
  const [text, setText] = useState(() => caliberToText(value))
  const external = caliberToText(value)
  const [syncedExternal, setSyncedExternal] = useState(external)

  if (external !== syncedExternal) {
    setSyncedExternal(external)
    if (external !== text) setText(external)
  }

  return (
    <View className='flex-row items-center gap-2'>
      <Input
        isFluid
        value={text}
        onChangeText={next => setText(next.replace(/[^\d,+\s]/g, ''))}
        onBlur={() => onChange(parseCaliber(text))}
        placeholder='Например: 45+, 55+, 65'
        accessibilityLabel='Калибр'
      />
      {unit && <Text className='text-sm text-gray-500'>{unit}</Text>}
    </View>
  )
}
