'use client'

import { useState } from 'react'

import {
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@/components/ui'

import { ICategoryFeature } from '../../categories/types'
import { FeatureFilterValue } from '../types/filter.types'

interface FilterFeatureFieldProps {
  feature: ICategoryFeature
  value: FeatureFilterValue | undefined
  onChange: (value: FeatureFilterValue | undefined) => void
}

// Текущий год выпуска техники — потолок диапазона у YearRangeField ниже.
// Вычисляется один раз при загрузке модуля, а не на каждый рендер: значение
// в рамках одной вкладки браузера не может измениться (переход через
// полночь 31 декабря никого не заблокирует — просто до следующей
// перезагрузки страницы самый новый год не будет в списке, не критично для
// фильтра техники).
const CURRENT_YEAR = new Date().getFullYear()
// Нижняя граница диапазона — самая старая техника, которую реально
// встретить на вторичном рынке (советские тракторы/комбайны 60-70х ещё
// эксплуатируются и продаются), с запасом.
const MIN_YEAR = 1960
const YEARS = Array.from({ length: CURRENT_YEAR - MIN_YEAR + 1 }, (_, i) => CURRENT_YEAR - i)

export const FilterFeatureField = ({ feature, value, onChange }: FilterFeatureFieldProps) => {
  if (feature.type === 'NUMBER') {
    // "Год выпуска" — единственная числовая характеристика, для которой
    // ввод произвольного числа хуже, чем выбор из списка: обычный
    // NumberRangeField пропустит и "1500", и "20266" как валидное число,
    // тогда как для года это заведомо не может дать результатов. Условие
    // по имени поля (см. server/prisma/data — во всех категориях техники
    // это заведено с единым именем 'year', проверено через
    // GET /categories/:id/features) — самый устойчивый признак,
    // устойчивее сопоставления по тексту подписи (label задаётся в БД и
    // теоретически может быть переформулирован).
    if (feature.name === 'year') {
      return <YearRangeField feature={feature} value={value} onChange={onChange} />
    }

    return <NumberRangeField feature={feature} value={value} onChange={onChange} />
  }

  if (feature.type === 'SELECT' || feature.type === 'MULTI_SELECT') {
    return <OptionsField feature={feature} value={value} onChange={onChange} />
  }

  if (feature.type === 'BOOLEAN') {
    return <BooleanField feature={feature} value={value} onChange={onChange} />
  }

  return null
}

const NumberRangeField = ({ feature, value, onChange }: FilterFeatureFieldProps) => {
  const range = value && typeof value === 'object' && !Array.isArray(value) ? value : undefined

  const [min, setMin] = useState(range?.min !== undefined ? String(range.min) : '')
  const [max, setMax] = useState(range?.max !== undefined ? String(range.max) : '')

  // Синхронизация с внешним изменением (сброс/чип/"Назад" в браузере) —
  // сравнение прямо в теле рендера, а не в useEffect: тот же паттерн, что и
  // в use-search.ts/filter.tsx (см. U4, U5 в ROADMAP.md); правило
  // react-hooks/set-state-in-effect в проекте включено.
  const rangeKey = `${range?.min}|${range?.max}`
  const [prevRangeKey, setPrevRangeKey] = useState(rangeKey)
  if (rangeKey !== prevRangeKey) {
    setPrevRangeKey(rangeKey)
    setMin(range?.min !== undefined ? String(range.min) : '')
    setMax(range?.max !== undefined ? String(range.max) : '')
  }

  const commit = () => {
    const parsedMin = min.trim() === '' ? undefined : Number(min)
    const parsedMax = max.trim() === '' ? undefined : Number(max)

    if (
      (parsedMin !== undefined && !Number.isFinite(parsedMin)) ||
      (parsedMax !== undefined && !Number.isFinite(parsedMax))
    ) {
      return
    }

    if (parsedMin === undefined && parsedMax === undefined) {
      onChange(undefined)
      return
    }

    onChange({ min: parsedMin, max: parsedMax })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  // Значение всегда хранится и фильтруется на бэкенде в КАНОНИЧЕСКОЙ единице
  // (units[0], см. комментарий у ICategoryFeature.units в
  // categories.types.ts) — у backend-фильтра (AdsService.resolveFeatureFilters)
  // нет никакой конвертации единиц, он просто сравнивает сырое значение из
  // ads.features. Раньше рядом с полем не было ВООБЩЕ никакой подсказки о
  // единице — пользователь мог ввести "5" для "Рабочая ширина" не понимая,
  // 5 мм это или 5 м, и получить бессмысленную выдачу. Показываем
  // каноническую единицу подписью — то же самое место в вёрстке, что и у
  // формы подачи объявления для случая с одной единицей (см.
  // dynamic-field.tsx), но здесь без выбора единицы: конвертировать
  // введённое число не во что — фильтр всё равно уйдёт в канонической.
  const unit = feature.units?.[0]

  return (
    <div className='flex flex-col gap-2'>
      <Label>{unit ? `${feature.label}, ${unit}` : feature.label}</Label>
      <div className='flex items-center gap-2'>
        <Input
          type='number'
          placeholder='От'
          value={min}
          onChange={e => setMin(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          className='h-11'
        />
        <Input
          type='number'
          placeholder='До'
          value={max}
          onChange={e => setMax(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          className='h-11'
        />
      </div>
    </div>
  )
}

// "Год выпуска" — два select'а вместо свободного ввода числа: список лет
// нельзя перепутать по величине/единице (в отличие от остальных NUMBER-
// характеристик), и выбор из ограниченного списка полностью исключает
// заведомо бессмысленные значения вроде года в будущем или "20266".
const YearRangeField = ({ feature, value, onChange }: FilterFeatureFieldProps) => {
  const range = value && typeof value === 'object' && !Array.isArray(value) ? value : undefined

  const commit = (nextMin: number | undefined, nextMax: number | undefined) => {
    if (nextMin === undefined && nextMax === undefined) {
      onChange(undefined)
      return
    }

    onChange({ min: nextMin, max: nextMax })
  }

  return (
    <div className='flex flex-col gap-2'>
      <Label>{feature.label}</Label>
      <div className='flex gap-2'>
        <Select
          value={range?.min !== undefined ? String(range.min) : ''}
          onValueChange={(val: string | null) => commit(val ? Number(val) : undefined, range?.max)}
        >
          <SelectTrigger className='h-11! px-4'>
            <SelectValue placeholder='От'>{(v: string | null) => v || 'От'}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align='start'>
            <SelectItem value='' className='rounded-none px-4'>
              От
            </SelectItem>
            {YEARS.map(year => (
              <SelectItem key={year} value={String(year)} className='rounded-none px-4'>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={range?.max !== undefined ? String(range.max) : ''}
          onValueChange={(val: string | null) => commit(range?.min, val ? Number(val) : undefined)}
        >
          <SelectTrigger className='h-11! px-4'>
            <SelectValue placeholder='До'>{(v: string | null) => v || 'До'}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align='start'>
            <SelectItem value='' className='rounded-none px-4'>
              До
            </SelectItem>
            {YEARS.map(year => (
              <SelectItem key={year} value={String(year)} className='rounded-none px-4'>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

const OptionsField = ({ feature, value, onChange }: FilterFeatureFieldProps) => {
  const selected = Array.isArray(value) ? value : []

  if (!feature.options?.length) return null

  const toggle = (option: string, checked: boolean) => {
    const next = checked ? [...selected, option] : selected.filter(v => v !== option)
    onChange(next.length ? next : undefined)
  }

  return (
    <div className='flex flex-col gap-2'>
      <Label>{feature.label}</Label>
      <div className='flex flex-col flex-wrap gap-x-4 gap-y-2'>
        {feature.options.map(option => (
          <label key={option} className='flex cursor-pointer items-center gap-2 text-sm'>
            <Checkbox
              checked={selected.includes(option)}
              onCheckedChange={checked => toggle(option, checked === true)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

const BooleanField = ({ feature, value, onChange }: FilterFeatureFieldProps) => {
  const checked = value === true

  return (
    <label className='flex w-fit cursor-pointer items-center justify-between gap-x-3'>
      <span className='text-sm'>{feature.label}</span>
      <Switch checked={checked} onCheckedChange={next => onChange(next ? true : undefined)} />
    </label>
  )
}
