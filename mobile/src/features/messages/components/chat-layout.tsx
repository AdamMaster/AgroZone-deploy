import type { ReactNode } from 'react'
import { KeyboardAvoidingView, View } from 'react-native'

import { MessagesHeading } from './messages-heading'

interface ChatLayoutProps {
  header: ReactNode
  thread: ReactNode
  composer: ReactNode
}

// Открытая переписка — как на сайте: заголовок «Сообщения», шапка диалога,
// лента и поле ввода над нижней панелью. Поле поднимается над клавиатурой
// на обеих платформах: padding считается по тому, насколько клавиатура
// реально перекрывает экран, поэтому и там, где Android сам сжимает окно,
// и там, где не сжимает (edge-to-edge), отступ получается верным. Нижняя
// панель на Android на время набора прячется — см. SiteTabBar.
export function ChatLayout({ header, thread, composer }: ChatLayoutProps) {
  return (
    <KeyboardAvoidingView behavior='padding' className='flex-1'>
      <View className='flex-1 px-4 pt-3 pb-3'>
        <MessagesHeading />
        {header}
        {thread}
        {composer}
      </View>
    </KeyboardAvoidingView>
  )
}
