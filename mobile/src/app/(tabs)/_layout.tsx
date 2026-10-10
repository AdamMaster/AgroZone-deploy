import { Tabs } from 'expo-router'

import { SiteTabBar } from '@/features/navigation/components/site-tab-bar'

export default function TabsLayout() {
  return (
    <Tabs tabBar={props => <SiteTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name='(home)' />
      <Tabs.Screen name='(favorites)' />
      <Tabs.Screen name='(my-ads)' />
      <Tabs.Screen name='messages' />
      <Tabs.Screen name='profile' />
    </Tabs>
  )
}
