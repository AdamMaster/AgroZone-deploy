import type { LucideIcon } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'

import { type ThemePreference, useThemeStore } from '@/features/theme/store/theme-store'

import { Heading } from '@/shared/components/heading'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Monitor, Moon, Sun } from '@/shared/icons/lucide'

import { ProfileSectionScreen } from './profile-section-screen'
import { SettingsCard } from './settings-card'

const THEME_OPTIONS: readonly { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Светлая', icon: Sun },
  { value: 'dark', label: 'Тёмная', icon: Moon },
  { value: 'system', label: 'Системная', icon: Monitor }
]

// «Персонализация» — выбор темы, как на сайте. Настройка вида каталога
// (список/сетка) на сайте только для компьютера — на телефоне всегда
// сетка, поэтому её здесь нет.
export function ProfilePersonalizationScreen() {
  const preference = useThemeStore(state => state.preference)
  const setPreference = useThemeStore(state => state.setPreference)
  const foregroundColor = useThemeColor('--color-foreground')

  return (
    <ProfileSectionScreen title='Персонализация'>
      <View className='gap-4'>
        <Heading level={5}>Тема оформления</Heading>
        <SettingsCard label='Оформление приложения' description='Светлая, тёмная или тема вашего устройства'>
          <View accessibilityRole='radiogroup' className='flex-row flex-wrap gap-2'>
            {THEME_OPTIONS.map(option => {
              const Icon = option.icon
              const isActive = preference === option.value

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole='radio'
                  accessibilityState={{ checked: isActive }}
                  onPress={() => setPreference(option.value)}
                  className={`flex-row items-center gap-2 rounded-lg border px-4 py-2.5 ${
                    isActive ? 'border-primary bg-primary' : 'border-border bg-background active:bg-muted'
                  }`}
                >
                  <Icon size={16} color={isActive ? '#ffffff' : foregroundColor} />
                  <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-foreground'}`}>
                    {option.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </SettingsCard>
      </View>
    </ProfileSectionScreen>
  )
}
