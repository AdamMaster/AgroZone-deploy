'use client'

import { ArrowLeft, Building2, Flag, ShieldCheck, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

// По той же стилистике, что и SettingsNav (см.
// components/features/user/components/settings-nav.tsx) — отдельный
// компонент, а не переиспользование SettingsNav, потому что аудитория и
// набор разделов у админки совсем другие.
const items = [
  { label: 'Модерация объявлений', icon: ShieldCheck, id: 'moderation', href: '/admin/moderation' },
  { label: 'Жалобы', icon: Flag, id: 'reports', href: '/admin/reports' },
  { label: 'Фиды дилеров', icon: Building2, id: 'dealers', href: '/admin/dealers' },
  { label: 'Пользователи', icon: UserPlus, id: 'users', href: '/admin/users' }
]

export const AdminNav = () => {
  const pathname = usePathname()

  return (
    <nav>
      <ul className='flex flex-col gap-1 px-2'>
        {items.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-neutral-50 hover:bg-neutral-600/30',
                  isActive && 'bg-neutral-600/30'
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
