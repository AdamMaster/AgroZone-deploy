import { View } from 'react-native'

import { FieldLabel } from '@/shared/components/field-label'
import type { SheetOption } from '@/shared/components/options-sheet'
import { SelectField } from '@/shared/components/select-field'
import { SELLER_TYPE_OPTIONS, type SellerType } from '@/shared/constants/seller-types'

// '' — «Все продавцы», фильтр не задан.
type SellerTypeOption = SellerType | ''

const OPTIONS: readonly SheetOption<SellerTypeOption>[] = [{ value: '', label: 'Все продавцы' }, ...SELLER_TYPE_OPTIONS]

interface SellerTypeFilterProps {
  value: SellerType | undefined
  onChange: (value: SellerType | undefined) => void
}

// Частное лицо / ИП / компания — как SellerTypeFilter сайта.
export function SellerTypeFilter({ value, onChange }: SellerTypeFilterProps) {
  return (
    <View className='gap-2'>
      <FieldLabel>Тип продавца</FieldLabel>
      <SelectField
        width='full'
        value={value ?? ''}
        options={OPTIONS}
        onChange={next => onChange(next || undefined)}
        accessibilityLabel='Тип продавца'
      />
    </View>
  )
}
