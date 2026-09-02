'use client'

import { SendHorizontal } from 'lucide-react'
import { type KeyboardEvent, useState } from 'react'

import { Button } from '@/components/ui'
import { Textarea } from '@/components/ui/textarea'

interface MessageComposerProps {
  onSend: (text: string) => void
  isSending?: boolean
  placeholder?: string
}

export const MessageComposer = ({ onSend, isSending, placeholder = 'Сообщение...' }: MessageComposerProps) => {
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

  return (
    <div className='flex items-end gap-2'>
      <Textarea
        value={text}
        onChange={event => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className='min-h-12 flex-1 resize-none px-4! py-3 wrap-anywhere placeholder:text-gray-400'
      />
      <Button size='icon-lg' className='size-12! rounded-lg!' onClick={handleSend} disabled={!text.trim() || isSending}>
        <SendHorizontal />
      </Button>
    </div>
  )
}
