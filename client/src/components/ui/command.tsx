'use client'

import { Command as CommandPrimitive, useCommandState } from 'cmdk'
import { CheckIcon, SearchIcon } from 'lucide-react'
import * as React from 'react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group'

import { cn } from '@/lib/utils'

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot='command'
      className={cn('bg-popover text-popover-foreground flex size-full flex-col rounded-lg!', className)}
      {...props}
    />
  )
}

function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, 'children'> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      {/* DialogHeader/DialogTitle — раньше стояли здесь, прямым потомком
          <Dialog>, а не внутри DialogContent. DialogPrimitive.Root
          "Doesn't render its own HTML element" — просто прокидывает
          контекст и рендерит children как есть, БЕЗ условия на open: в
          отличие от DialogContent (он оборачивает содержимое в
          DialogPortal и монтируется в DOM только пока диалог открыт),
          прежнее расположение означало, что sr-only <h2> с заголовком
          диалога («Выберите регион» у HomeLocationPicker) присутствовал в
          DOM ВСЕГДА, а не только пока диалог реально открыт — и, будучи
          первым заголовком в разметке главной страницы (которая до
          соседней задачи S4 в ROADMAP.md не имела собственного <h1>),
          оказывался первым заголовком на всей странице, хотя визуально
          и для скринридера в состоянии "закрыто" его как бы не должно
          быть. DialogTitle резолвит accessible name диалога через общий
          store (store.useSyncedValueWithCleanup('titleElementId', ...)),
          а не через положение в дереве — так что перенос внутрь
          DialogContent ничего не ломает в доступности (aria-labelledby
          на попапе продолжает указывать на этот же title), но теперь
          сам <h2> монтируется в DOM только когда диалог открыт. */}
      <DialogContent
        className={cn('top-1/3 translate-y-0 rounded-xl! p-0', className)}
        showCloseButton={showCloseButton}
      >
        <DialogHeader className='sr-only'>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/* CommandInput/CommandList и другие Command-примитивы читают
            состояние (фильтр, выбранный пункт) из контекста, который
            создаёт именно корневой cmdk Command — без этой обёртки они
            падают с "Cannot read properties of undefined (reading
            'subscribe')" при попытке прочитать несуществующий контекст. */}
        <Command>{children}</Command>
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot='command-input-wrapper' className='h-11 p-0'>
      <InputGroup className='border-input/30 h-full flex-row items-center bg-gray-50 shadow-none! *:data-[slot=input-group-addon]:pl-2!'>
        <CommandPrimitive.Input
          data-slot='command-input'
          className={cn(
            'h-full w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        <InputGroupAddon>
          <SearchIcon className='size-5 shrink-0 opacity-50' />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  const listRef = React.useRef<React.ComponentRef<typeof CommandPrimitive.List>>(null)
  const search = useCommandState(state => state.search)

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: 0 })
  }, [search])

  return (
    <CommandPrimitive.List
      ref={listRef}
      data-slot='command-list'
      className={cn('no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none', className)}
      {...props}
    />
  )
}

function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot='command-empty'
      className={cn('py-6 text-center text-sm', className)}
      {...props}
    />
  )
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot='command-group'
      className={cn(
        'text-foreground **:[[cmdk-group-heading]]:text-muted-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium',
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot='command-separator'
      className={cn('bg-border -mx-1 h-px', className)}
      {...props}
    />
  )
}

function CommandItem({ className, children, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot='command-item'
      className={cn(
        "group/command-item data-selected:bg-muted data-selected:text-foreground data-selected:*:[svg]:text-foreground relative flex cursor-default items-center gap-2 px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon className='ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100' />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot='command-shortcut'
      className={cn(
        'text-muted-foreground group-data-selected/command-item:text-foreground ml-auto text-xs tracking-widest',
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator
}
