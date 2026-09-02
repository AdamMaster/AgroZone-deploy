'use client'

import { useEffect, useState } from 'react'

import { Checkbox, Input, Label, Switch } from '@/components/ui'

import { ICategoryFeature } from '../../categories/types'
import { FeatureFilterValue } from '../types/filter.types'

interface FilterFeatureFieldProps {
  feature: ICategoryFeature
  value: FeatureFilterValue | undefined
  onChange: (value: FeatureFilterValue | undefined) => void
}

export const FilterFeatureField = ({ feature, value, onChange }: FilterFeatureFieldProps) => {
  if (feature.type === 'NUMBER') {
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

  useEffect(() => {
    setMin(range?.min !== undefined ? String(range.min) : '')
    setMax(range?.max !== undefined ? String(range.max) : '')
  }, [range?.min, range?.max])

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

  return (
    <div className='flex flex-col gap-2'>
      <Label>{feature.label}</Label>
      <div className='flex gap-2'>
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
