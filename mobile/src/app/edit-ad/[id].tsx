import { useLocalSearchParams } from 'expo-router'

import { EditAdScreen } from '@/features/ad-form/components/edit-ad-screen'

export default function EditAdRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return <EditAdScreen key={id} id={id} />
}
