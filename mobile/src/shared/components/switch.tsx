import { Switch as NativeSwitch, type SwitchProps as NativeSwitchProps } from 'react-native'

import { useThemeColor } from '@/shared/hooks/use-theme-color'

type SwitchProps = Pick<NativeSwitchProps, 'value' | 'onValueChange' | 'disabled' | 'accessibilityLabel'>

// Переключатель — системный, в цветах сайта: включён — зелёный.
export function Switch(props: SwitchProps) {
  const primaryColor = useThemeColor('--color-primary')
  const trackOffColor = useThemeColor('--color-gray-200')

  return (
    <NativeSwitch
      trackColor={{ false: trackOffColor, true: primaryColor }}
      thumbColor='#ffffff'
      ios_backgroundColor={trackOffColor}
      {...props}
    />
  )
}
