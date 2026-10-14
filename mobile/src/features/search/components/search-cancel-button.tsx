import { Pressable, Text } from 'react-native'

interface SearchCancelButtonProps {
  onPress: () => void
}

// «Отменить» справа от поля поиска, пока в нём фокус — отдельная кнопка рядом
// с полем, а не часть него: как Button «Отменить» в SearchBar сайта (ghost без
// фона, h-10, text-xs, отступ слева 16 px, справа нет).
export function SearchCancelButton({ onPress }: SearchCancelButtonProps) {
  return (
    <Pressable accessibilityRole='button' onPress={onPress} hitSlop={8} className='h-10 justify-center pl-4'>
      <Text className='text-xs'>Отменить</Text>
    </Pressable>
  )
}
