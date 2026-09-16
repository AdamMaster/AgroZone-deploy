'use client'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import * as React from 'react'

import { cn } from '@/lib/utils'

// Базовый Popover на @base-ui/react (тот же примитив, что уже использует
// Dialog, см. dialog.tsx) — в проекте нет shadcn-реестра под наш кастомный
// стиль ("base-nova"), а `npx shadcn add popover` не смог достучаться до
// реестра из окружения, где это писалось (сеть до ui.shadcn.com
// недоступна оттуда) — компонент собран вручную по официальной доке Base UI
// (https://base-ui.com/react/components/popover), 1:1 с тем, как устроен
// Dialog в этом же файле рядом.
function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot='popover' {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot='popover-trigger' {...props} />
}

function PopoverPortal({ ...props }: PopoverPrimitive.Portal.Props) {
  return <PopoverPrimitive.Portal data-slot='popover-portal' {...props} />
}

function PopoverContent({
  className,
  side = 'bottom',
  align = 'center',
  sideOffset = 8,
  alignOffset = 0,
  children,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, 'side' | 'align' | 'sideOffset' | 'alignOffset'>) {
  return (
    <PopoverPortal>
      {/* z-index — именно на Positioner, а не на Popup ниже: floating-ui
          позиционирует (position: absolute/fixed) сам Positioner, а Popup —
          обычный статично спозиционированный div, на котором z-index браузер
          просто игнорирует. Раньше z-110 висел на Popup и визуально ничего
          не менял — попап календаря всё равно оставался под модалкой. */}
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className='z-110'
      >
        <PopoverPrimitive.Popup
          data-slot='popover-content'
          className={cn(
            'bg-popover text-popover-foreground data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 w-auto rounded-xl p-4 text-sm outline-none dark:bg-neutral-800',
            className
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPortal>
  )
}

function PopoverClose({ ...props }: PopoverPrimitive.Close.Props) {
  return <PopoverPrimitive.Close data-slot='popover-close' {...props} />
}

export { Popover, PopoverClose, PopoverContent, PopoverPortal, PopoverTrigger }
