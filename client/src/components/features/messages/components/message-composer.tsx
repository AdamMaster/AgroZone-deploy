'use client'

import { SendHorizontal } from 'lucide-react'
import { type KeyboardEvent, useState } from 'react'

import { Button } from '@/components/ui'
import { Textarea } from '@/components/ui/textarea'

import { cn } from '@/lib/utils'

interface MessageComposerProps {
  onSend: (text: string) => void
  isSending?: boolean
  placeholder?: string
  maxLength?: number
}

// Тот же лимит, что и в SendMessageDto/SendSupportMessageDto на бэкенде
// (class-validator @MaxLength(2000)) — держим в синхроне, чтобы фронт не
// разрешал набрать то, что бэк всё равно отклонит с ошибкой валидации уже
// после отправки. maxLength на самой textarea (ниже) не даёт напечатать
// или вставить текст длиннее лимита вообще — защищает и от случайного
// "скинуть по приколу текст на несколько страниц".
const DEFAULT_MAX_LENGTH = 2000

export const MessageComposer = ({
  onSend,
  isSending,
  placeholder = 'Сообщение...',
  maxLength = DEFAULT_MAX_LENGTH
}: MessageComposerProps) => {
  const [text, setText] = useState('')

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return

    onSend(trimmed)
    setText('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const remaining = maxLength - text.length
  // Счётчик показываем только когда до лимита действительно близко — не
  // загромождаем композер цифрами при обычной короткой переписке.
  const showCounter = remaining <= 200

  return (
    <div className='flex flex-col gap-1'>
      <div className='flex items-end gap-2'>
        <Textarea
          value={text}
          onChange={event => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          maxLength={maxLength}
          className='min-h-12 flex-1 resize-none px-4! py-3 wrap-anywhere placeholder:text-gray-400'
        />
        <Button size='icon-lg' className='size-12! rounded-lg!' onClick={handleSend} disabled={!text.trim() || isSending}>
          <SendHorizontal />
        </Button>
      </div>
      {showCounter && (
        <span className={cn('self-end text-xs', remaining <= 0 ? 'text-red-500' : 'text-gray-400')}>
          {text.length}/{maxLength}
        </span>
      )}
    </div>
  )
}
