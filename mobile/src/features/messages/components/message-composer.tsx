import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import { SendHorizontal } from '@/shared/icons/lucide'

interface MessageComposerProps {
  // Отправить текст; вернёт true, если отправка удалась (поле очищается
  // только тогда — текст не теряется при ошибке сети).
  onSend: (text: string) => Promise<boolean>
  isSending: boolean
  placeholder?: string
}

// Тот же предел, что у сервера (SendMessageDto, @MaxLength(2000)).
const MAX_LENGTH = 2000
// Счётчик — только когда до предела близко, как на сайте.
const COUNTER_THRESHOLD = 200

// Поле сообщения и кнопка «Отправить» — как MessageComposer сайта.
export function MessageComposer({ onSend, isSending, placeholder = 'Сообщение...' }: MessageComposerProps) {
  const [text, setText] = useState('')
  const trimmed = text.trim()
  const remaining = MAX_LENGTH - text.length
  const canSend = trimmed.length > 0 && !isSending

  const send = async () => {
    if (!canSend) return
    if (await onSend(trimmed)) setText('')
  }

  return (
    <View className='gap-1'>
      <View className='flex-row items-end gap-2'>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColorClassName='accent-gray-400'
          accessibilityLabel={placeholder}
          multiline
          // Поле начинается с одной строки и растёт с текстом (до max-h-32).
          numberOfLines={1}
          maxLength={MAX_LENGTH}
          textAlignVertical='center'
          className='max-h-32 min-h-12 flex-1 rounded-lg border border-border bg-gray-50 px-4 py-3 text-base text-gray-950'
        />
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Отправить'
          accessibilityState={{ disabled: !canSend, busy: isSending }}
          disabled={!canSend}
          onPress={() => void send()}
          className='size-12 items-center justify-center rounded-lg bg-primary active:opacity-80 disabled:opacity-50'
        >
          <SendHorizontal size={20} color='#ffffff' />
        </Pressable>
      </View>
      {remaining <= COUNTER_THRESHOLD && (
        <Text className={`self-end text-xs ${remaining <= 0 ? 'text-red-500' : 'text-gray-400'}`}>
          {text.length}/{MAX_LENGTH}
        </Text>
      )}
    </View>
  )
}
