'use client'

import { ru } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'

import { Button, Calendar, Popover, PopoverContent, PopoverTrigger } from '@/components/ui'

import { formatFullDate, toDateInputValue } from '@/shared/utils'

import { cn } from '@/lib/utils'

interface DatePickerProps {
  // Тот же формат, что раньше отдавал native <input type='date'> —
  // 'yyyy-MM-dd' или '' для пустого значения. Специально не Date | null,
  // чтобы заменить инпут на календарь без переписывания состояния и логики
  // пресетов (+7/+30/+90 дней) в SetPremiumDialog/SetAdExpirationDialog —
  // им без разницы, откуда пришла строка.
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export const DatePicker = ({
  value,
  onChange,
  placeholder = 'Выберите дату',
  className,
  disabled
}: DatePickerProps) => {
  const [open, setOpen] = useState(false)

  const selected = value ? new Date(`${value}T00:00:00`) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type='button'
            disabled={disabled}
            className={cn(
              'w-full justify-start gap-2 bg-gray-100 text-left font-normal text-inherit',
              !selected && 'text-gray-500',
              className
            )}
          />
        }
      >
        <CalendarIcon className='size-4 shrink-0' />
        {selected ? formatFullDate(selected) : placeholder}
      </PopoverTrigger>

      <PopoverContent align='start' className='custom-shadow w-auto p-0'>
        <Calendar
          mode='single'
          locale={ru}
          selected={selected}
          defaultMonth={selected}
          onSelect={date => {
            onChange(date ? toDateInputValue(date) : '')
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
