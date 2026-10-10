import * as WebBrowser from 'expo-web-browser'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import type { UserProfile } from '@/features/auth/types/auth.types'

import { Button } from '@/shared/components/button'
import { FormField } from '@/shared/components/form-field'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { FileText, X } from '@/shared/icons/lucide'
import { formatFileSize } from '@/shared/utils/format-file-size'

import { useRemovePresentation, useUpdatePresentation } from '../hooks/use-profile-mutations'
import { pickFileThen, pickPresentationDocument } from '../lib/pick-files'

// «Презентация компании» — документ, который видят все в публичном
// профиле продавца (прайс-лист, каталог).
export function PresentationField({ profile }: { profile: UserProfile }) {
  const { mutate: updatePresentation, isPending: isUploading } = useUpdatePresentation()
  const { mutate: removePresentation, isPending: isRemoving } = useRemovePresentation()
  const isBusy = isUploading || isRemoving
  const iconColor = useThemeColor('--color-gray-400')

  const { presentationUrl } = profile

  const choose = () => void pickFileThen(pickPresentationDocument, file => updatePresentation(file))

  return (
    <FormField
      label='Презентация компании'
      description='Прайс-лист, каталог или файл о вашей компании — покажем его в вашем публичном профиле, всем посетителям сайта. Форматы: PDF, DOCX, XLSX, PPTX, до 15 МБ.'
    >
      {presentationUrl ? (
        <View className='flex-row items-center gap-3 rounded-lg border border-border p-3'>
          <FileText size={20} color={iconColor} />
          <View className='min-w-0 flex-1'>
            <Text
              accessibilityRole='link'
              numberOfLines={1}
              className='text-sm font-medium text-gray-900 underline'
              onPress={() => void WebBrowser.openBrowserAsync(presentationUrl)}
            >
              {profile.presentationFileName ?? 'Презентация'}
            </Text>
            {typeof profile.presentationFileSize === 'number' && (
              <Text className='text-xs text-gray-500'>{formatFileSize(profile.presentationFileSize)}</Text>
            )}
          </View>
          {isBusy ? (
            <ActivityIndicator colorClassName='accent-primary' />
          ) : (
            <>
              <Pressable accessibilityRole='button' hitSlop={8} onPress={choose}>
                <Text className='text-sm text-gray-500'>Заменить</Text>
              </Pressable>
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='Удалить презентацию'
                hitSlop={8}
                onPress={() => removePresentation()}
                className='rounded-full p-1.5 active:bg-gray-100'
              >
                <X size={16} color={iconColor} />
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <View className='self-start'>
          <Button
            title={isUploading ? 'Загружаем...' : 'Загрузить файл'}
            variant='outline'
            size='sm'
            disabled={isUploading}
            onPress={choose}
          />
        </View>
      )}
    </FormField>
  )
}
