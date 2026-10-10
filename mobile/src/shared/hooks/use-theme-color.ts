import { useCSSVariable } from 'uniwind'

// Цвет из темы (global.css) строкой — для того, что красится не классами, а
// пропсом color: иконки, нативные компоненты. Значение меняется вместе со
// светлой/тёмной темой.
export function useThemeColor(variable: `--color-${string}`): string {
  const value = useCSSVariable(variable)

  return typeof value === 'string' ? value : '#000000'
}
