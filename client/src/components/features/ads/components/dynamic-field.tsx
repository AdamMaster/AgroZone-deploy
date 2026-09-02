import { Control, Controller } from 'react-hook-form'

import {
  Checkbox,
  Field,
  FieldError,
  Input,
  InputGroup,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui'

import { TypeCreateAdSchema } from '../schemes'
import { ICategoryFeature } from '../types/ad.types'

interface DynamicFieldProps {
  feature: ICategoryFeature
  control: Control<TypeCreateAdSchema>
}

export const DynamicField = ({ feature, control }: DynamicFieldProps) => {
  return (
    <Controller
      name={`categoryFeatures.${feature.name}`}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className='group mb-4' isInvalid={fieldState.invalid}>
          <InputGroup>
            {feature.type !== 'BOOLEAN' && <Label>{feature.label}</Label>}

            {feature.type === 'SELECT' ? (
              <Select
                onValueChange={(val: string | null) => {
                  field.onChange(val === 'none' ? null : val)
                }}
                value={field.value ? String(field.value) : null}
              >
                <SelectTrigger className='h-11! px-4 sm:h-12! md:h-13!'>
                  <SelectValue placeholder='Не выбрано' />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align='start'>
                  {feature.options?.map((opt: string) => (
                    <SelectItem key={opt} value={String(opt)} className='rounded-none px-4'>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : feature.type === 'MULTI_SELECT' ? (
              <div className='flex flex-wrap gap-2'>
                {feature.options?.map(option => {
                  const values: string[] = field.value ?? []
                  const checked = values.includes(option)

                  return (
                    <button
                      key={option}
                      type='button'
                      onClick={() => {
                        if (checked) {
                          field.onChange(values.filter(v => v !== option))
                        } else {
                          field.onChange([...values, option])
                        }
                      }}
                      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                        checked
                          ? 'border-secondary bg-secondary text-white'
                          : 'border-border bg-background hover:bg-muted'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            ) : feature.type === 'BOOLEAN' ? (
              <label className='flex items-center gap-2'>
                <Checkbox checked={!!field.value} onCheckedChange={field.onChange} className='size-5' />
                <span className='text-sm'>{feature.label}</span>
              </label>
            ) : feature.type === 'NUMBER' ? (
              <div className='flex items-center gap-2'>
                <Input
                  className='h-11! px-4 sm:h-12! md:h-13!'
                  {...field}
                  type='number'
                  value={field.value === null || field.value === undefined ? '' : String(field.value)}
                  onChange={e => {
                    const val = e.target.value
                    field.onChange(val === '' ? null : Number(val))
                  }}
                />
                {!!feature.units?.length &&
                  (feature.units.length === 1 ? (
                    <span className='shrink-0 text-sm text-gray-500'>{feature.units[0]}</span>
                  ) : (
                    <Controller
                      name={`categoryFeatures.${feature.name}__unit`}
                      control={control}
                      defaultValue={feature.units[0]}
                      render={({ field: unitField }) => (
                        <div className='flex shrink-0 gap-1'>
                          {feature.units!.map(u => {
                            const selected = (unitField.value ?? feature.units![0]) === u

                            return (
                              <button
                                key={u}
                                type='button'
                                onClick={() => unitField.onChange(u)}
                                className={`size-10 rounded-full border px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                                  selected
                                    ? 'border-secondary bg-secondary text-white'
                                    : 'border-border bg-background hover:bg-muted'
                                }`}
                              >
                                {u}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    />
                  ))}
              </div>
            ) : (
              <Input
                className='h-11! px-4 sm:h-12! md:h-13!'
                {...field}
                type='text'
                value={field.value === null || field.value === undefined ? '' : String(field.value)}
                onChange={e => {
                  const val = e.target.value
                  field.onChange(val === '' ? null : val)
                }}
              />
            )}
          </InputGroup>

          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
