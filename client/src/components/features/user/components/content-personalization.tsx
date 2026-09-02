'use client'

import { useCatalogViewStore } from '@/store'
import { LayoutGrid, LayoutList, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Field, FieldDescription, Heading, Label } from '@/components/ui'

import { useMounted } from '@/shared/hooks'

import { cn } from '@/lib/utils'

const THEME_OPTIONS = [
  { value: 'light', label: 'Светлая', icon: Sun },
  { value: 'dark', label: 'Тёмная', icon: Moon },
  { value: 'system', label: 'Системная', icon: Monitor }
] as const

const VIEW_OPTIONS = [
  { value: 'cols-1', label: 'Список', icon: LayoutList },
  { value: 'cols-4', label: 'Сетка', icon: LayoutGrid }
] as const

const OPTION_BUTTON_CLASS_NAME =
  'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors'

export const ContentPersonalization = () => {
  const { theme, setTheme } = useTheme()
  const { layout, setLayout } = useCatalogViewStore()
  const mounted = useMounted()

  return (
    <div className='max-w-[800px]'>
      <Heading level={2} className='mb-6'>
        Персонализация
      </Heading>

      <div className='flex flex-col gap-8'>
        <div>
          <Heading level={5} className='mb-4'>
            Тема оформления
          </Heading>
          <Field className='rounded-lg border bg-gray-50 p-4'>
            <div className='mb-3 space-y-0.5'>
              <Label>Оформление сайта</Label>
              <FieldDescription>Светлая, тёмная или тема вашего устройства</FieldDescription>
            </div>
            <div className='flex flex-wrap gap-2'>
              {THEME_OPTIONS.map(option => {
                const Icon = option.icon
                const isActive = mounted && theme === option.value

                return (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      OPTION_BUTTON_CLASS_NAME,
                      isActive
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className='size-4' />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>

        <div>
          <Heading level={5} className='mb-4'>
            Вид каталога
          </Heading>
          <Field className='rounded-lg border bg-gray-50 p-4'>
            <div className='mb-3 space-y-0.5'>
              <Label>Раскладка объявлений по умолчанию</Label>
              <FieldDescription>Применяется на десктопе — на мобильных всегда сетка</FieldDescription>
            </div>
            <div className='flex flex-wrap gap-2'>
              {VIEW_OPTIONS.map(option => {
                const Icon = option.icon
                const isActive = layout === option.value

                return (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => setLayout(option.value)}
                    className={cn(
                      OPTION_BUTTON_CLASS_NAME,
                      isActive
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className='size-4' />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>
      </div>
    </div>
  )
}
