'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRoleAccess } from '@/hooks/useRoleAccess'
import { UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon?: ReactNode
  requiredRoles?: UserRole | UserRole[]
}

interface RoleNavProps {
  items: NavItem[]
  className?: string
}

export function RoleNav({ items, className }: RoleNavProps) {
  const { hasRole, isLoading } = useRoleAccess()
  const pathname = usePathname()

  // Filter items based on user role
  const visibleItems = items.filter(item => {
    if (isLoading) return false
    if (!item.requiredRoles) return true
    return hasRole(item.requiredRoles)
  })

  if (!visibleItems.length) return null

  return (
    <nav className={className}>
      <ul className="space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// Example usage:
export const defaultNavItems: NavItem[] = [
  {
    href: '/tickets',
    label: 'Tickets',
    requiredRoles: [UserRole.ADMIN, UserRole.AGENT, UserRole.USER]
  },
  {
    href: '/queue',
    label: 'Queue',
    requiredRoles: [UserRole.ADMIN, UserRole.AGENT]
  },
  {
    href: '/reports',
    label: 'Reports',
    requiredRoles: [UserRole.ADMIN, UserRole.AGENT]
  },
  {
    href: '/settings',
    label: 'Settings',
    requiredRoles: UserRole.ADMIN
  }
] 